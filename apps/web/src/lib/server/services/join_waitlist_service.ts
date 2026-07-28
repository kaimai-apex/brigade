import { getPool } from "@connectpro/common";
import { ensureWaitlistSchema } from "@/lib/waitlist/ensure-waitlist-schema";
import { COUNTRY_CODES } from "@/lib/waitlist/country-codes";
import { subscribeToKit } from "@/lib/waitlist/subscribe-to-kit";

/**
 * Joining the waitlist — the live app's one write path, extracted out of its
 * route handler.
 *
 * The web app predates @brigade/core and still runs on the legacy schemas, so
 * its services live here rather than in the core package. Same discipline
 * though: one entry point, all validation and persistence in one place, and no
 * HTTP types anywhere in it. The route is left to translate the result into a
 * response, and this can be called from a script or a test without a server.
 *
 * Behaviour is deliberately identical to what the route did inline — this is a
 * live signup path, so the move and any change to it are kept separate.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[\d\s().+-]{6,24}$/;
const VALID_CODES = new Set<string>(COUNTRY_CODES.map((c) => c.code));

export type JoinWaitlistInput = {
  email?: string;
  name?: string;
  phone?: string;
  phoneCountry?: string;
  source?: string;
};

export type JoinWaitlistResult =
  | { ok: false; status: 400; message: string }
  | {
      ok: true;
      status: 200;
      alreadyJoined: boolean;
      kitSynced: boolean;
      kitState: string | null;
      message: string;
    };

export class JoinWaitlistService {
  async call(input: JoinWaitlistInput): Promise<JoinWaitlistResult> {
    const email = input.email?.trim().toLowerCase() ?? "";
    const name = input.name?.trim().slice(0, 120) ?? "";
    const phoneRaw = input.phone?.trim() ?? "";
    const phoneCountry = input.phoneCountry?.trim() || "+1";
    const source = input.source?.trim().slice(0, 64) || "landing";

    if (!name || name.length < 2) {
      return { ok: false, status: 400, message: "Enter your name." };
    }
    if (!VALID_CODES.has(phoneCountry)) {
      return { ok: false, status: 400, message: "Pick a valid country code." };
    }

    const phoneDigits = phoneRaw.replace(/\D/g, "");
    if (!phoneRaw || !PHONE_RE.test(phoneRaw) || phoneDigits.length < 6) {
      return { ok: false, status: 400, message: "Enter a valid phone number." };
    }
    if (!email || !EMAIL_RE.test(email)) {
      return { ok: false, status: 400, message: "Enter a valid email address." };
    }

    const phone = `${phoneCountry} ${phoneDigits}`;

    await ensureWaitlistSchema();
    const pool = getPool();

    const result = await pool.query(
      `INSERT INTO public.waitlist_signups (email, name, phone, phone_country, source)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email) DO NOTHING
       RETURNING id`,
      [email, name, phone, phoneCountry, source],
    );

    const inserted = result.rowCount === 1;

    // Postgres is the source of truth; Kit is a mirror. A Kit outage must never
    // cost a signup, so failure is logged and the join still succeeds.
    // TODO: this belongs on a queue once the web app has one — it currently
    // adds an external round-trip to the user's request.
    const kit = await subscribeToKit({ email, name, phone });
    if (!kit.ok) {
      console.error("[waitlist/kit]", {
        via: kit.via,
        status: kit.status,
        hasApiKey: Boolean(process.env.KIT_API_KEY || process.env.CONVERTKIT_API_KEY),
      });
    }

    return {
      ok: true,
      status: 200,
      alreadyJoined: !inserted,
      kitSynced: kit.ok,
      kitState: kit.subscriberState ?? null,
      message: inserted
        ? "You're on the list. Check your email to confirm."
        : "You're already on the waitlist — talk soon.",
    };
  }
}
