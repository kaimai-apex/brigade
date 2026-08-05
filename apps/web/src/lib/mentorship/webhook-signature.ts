import { createHmac, timingSafeEqual, randomInt } from "node:crypto";

/**
 * Stripe webhook signature verification, and the booking's human-readable code.
 *
 * Pure functions over strings, like pricing.ts and availability.ts, so the one
 * piece of the money path that decides whether to trust a request can be tested
 * directly rather than by pointing Stripe at a laptop.
 *
 * This is hand-rolled rather than `stripe.webhooks.constructEvent` because the
 * rest of the Stripe integration is plain `fetch` against the REST API and
 * pulling in the SDK for one function would be the larger change. The algorithm
 * is small and fully specified: HMAC-SHA256 over "<timestamp>.<raw body>".
 */

/**
 * How old a signature may be. Stripe's own default.
 *
 * The window is what makes a captured request unusable later: without it, an
 * attacker who once observed a valid webhook could replay it forever, and every
 * replay is correctly signed. Five minutes is long enough to survive a slow
 * retry and short enough that a captured body goes stale.
 */
export const SIGNATURE_TOLERANCE_SECONDS = 300;

export class WebhookSignatureError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WebhookSignatureError";
  }
}

interface ParsedHeader {
  timestamp: number;
  signatures: string[];
}

/**
 * `t=1492774577,v1=5257a869…,v1=…`
 *
 * More than one v1 is normal: during a secret rotation Stripe signs with both
 * the old and the new secret, so any match is a match.
 */
function parseSignatureHeader(header: string): ParsedHeader {
  let timestamp = NaN;
  const signatures: string[] = [];

  for (const part of header.split(",")) {
    const index = part.indexOf("=");
    if (index === -1) continue;
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (key === "t") timestamp = Number(value);
    else if (key === "v1") signatures.push(value);
  }

  if (!Number.isFinite(timestamp)) {
    throw new WebhookSignatureError("Signature header has no timestamp");
  }
  if (signatures.length === 0) {
    throw new WebhookSignatureError("Signature header has no v1 signature");
  }
  return { timestamp, signatures };
}

/** Length-safe hex compare. timingSafeEqual throws on a length mismatch. */
function hexEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
  } catch {
    // Not valid hex — not a match, and not worth a distinct error: an attacker
    // learns nothing either way.
    return false;
  }
}

/**
 * Verify a Stripe webhook against the endpoint's signing secret.
 *
 * `payload` must be the EXACT bytes Stripe sent. Parsing the JSON and
 * re-serialising it changes key order and whitespace, and the signature will
 * never match again — read the body with `request.text()` and verify before
 * `JSON.parse`.
 *
 * Throws rather than returning false so a caller cannot accidentally treat the
 * failure as falsy-but-fine; the route turns it into a 400.
 */
export function verifyWebhookSignature(input: {
  payload: string;
  header: string | null;
  secret: string;
  /** Injectable so the spec can test the replay window without waiting. */
  nowSeconds?: number;
  toleranceSeconds?: number;
}): { timestamp: number } {
  const { payload, header, secret } = input;
  if (!header) throw new WebhookSignatureError("Missing Stripe-Signature header");
  if (!secret) throw new WebhookSignatureError("No webhook signing secret configured");

  const { timestamp, signatures } = parseSignatureHeader(header);

  const now = input.nowSeconds ?? Math.floor(Date.now() / 1000);
  const tolerance = input.toleranceSeconds ?? SIGNATURE_TOLERANCE_SECONDS;
  // Both directions: a future-dated timestamp is as suspicious as an old one,
  // and would otherwise extend the replay window indefinitely.
  if (Math.abs(now - timestamp) > tolerance) {
    throw new WebhookSignatureError("Signature timestamp is outside the tolerance window");
  }

  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${payload}`, "utf8")
    .digest("hex");

  if (!signatures.some((candidate) => hexEquals(candidate, expected))) {
    throw new WebhookSignatureError("Signature does not match the payload");
  }

  return { timestamp };
}

/**
 * Sign a payload the way Stripe would.
 *
 * Exported because the verification above is otherwise only exercisable by
 * making Stripe send something. This lets the spec produce a genuinely valid
 * signature and then tamper with it — the failure cases are the point, and they
 * are unreachable without being able to construct the success case first.
 */
export function signWebhookPayload(payload: string, secret: string, timestamp: number): string {
  const signature = createHmac("sha256", secret)
    .update(`${timestamp}.${payload}`, "utf8")
    .digest("hex");
  return `t=${timestamp},v1=${signature}`;
}

/**
 * A short code for the booking, for the receipt and for reading down a phone.
 *
 * The alphabet drops O/0, I/1 and S/5: these get transcribed by a person who
 * is holding a knife in the other hand. Six characters over 30 symbols is
 * ~729 million combinations, and the column has a unique index, so a collision
 * is a retry rather than a corrupted booking.
 */
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRTUVWXYZ2346789";

export function generateConfirmationCode(): string {
  let out = "";
  for (let i = 0; i < 6; i++) {
    out += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  }
  return `BRG-${out}`;
}

/** Shape check for a code arriving from a URL, before it reaches the database. */
export function isConfirmationCode(value: string): boolean {
  return /^BRG-[ABCDEFGHJKLMNPQRTUVWXYZ2346789]{6}$/.test(value);
}
