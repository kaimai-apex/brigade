/**
 * Sending the login code.
 *
 * Resend's REST API over `fetch`, rather than the `resend` package. The whole
 * integration is one POST with three fields; a dependency would add a package,
 * a licence to audit and a version to keep current in exchange for wrapping a
 * call we can write in ten lines.
 *
 * The email IS the login. If it does not arrive, nobody gets in — so this fails
 * loudly rather than pretending. In production a missing API key throws at the
 * point of sending, which surfaces as "we could not send that" on the form and
 * an error in the logs. It does not silently succeed.
 */

import { EMAIL_COLORS } from "@/lib/design/tokens";

/** Minutes the code stays valid. Stated in the email, so it lives here. */
export const CODE_TTL_MINUTES = 10;

export interface LoginCodeEmail {
  to: string;
  code: string;
}

function resendKey() {
  return process.env.RESEND_API_KEY?.trim() || "";
}

/**
 * The From address.
 *
 * Must be on a domain verified in Resend, or every send is rejected. Defaults
 * to the apex so a deploy that forgets the variable fails in an obvious,
 * greppable way rather than sending from a stranger's domain.
 */
function fromAddress() {
  return process.env.RESEND_FROM?.trim() || "Brigade <login@joinbrigade.co>";
}

export function isEmailConfigured() {
  return resendKey().length > 0;
}

/**
 * Whether the code may be shown to the person who asked for it.
 *
 * Development only, and only when there is no mail provider to send it — the
 * moment a key exists, the email is the channel. Both halves matter: the
 * NODE_ENV check keeps it out of production, and the key check keeps it from
 * masking a broken configuration locally.
 */
export function canRevealCode() {
  return process.env.NODE_ENV !== "production" && !isEmailConfigured();
}

function textBody(code: string) {
  return [
    `${code} is your Brigade code.`,
    ``,
    `Type it into the login screen. It works once and expires in ${CODE_TTL_MINUTES} minutes.`,
    ``,
    `If you did not ask to log in, you can ignore this — someone typed your`,
    `address and got nowhere.`,
  ].join("\n");
}

/**
 * The code, big enough to read off a phone on a pass.
 *
 * Deliberately plain. Login mail lands in spam for looking like marketing, and
 * the person reading this wants one number, not a masthead. Inline styles
 * because email clients discard everything else.
 */
function htmlBody(code: string) {
  const c = EMAIL_COLORS;
  return `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:${c.background};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:${c.text}">
    <div style="max-width:420px;margin:0 auto">
      <p style="margin:0 0 24px;font-size:15px;line-height:1.5">Here is your code to log in to Brigade.</p>
      <p style="margin:0 0 24px;font-size:38px;font-weight:700;letter-spacing:0.14em;font-family:ui-monospace,SFMono-Regular,Menlo,monospace">${code}</p>
      <p style="margin:0 0 24px;font-size:15px;line-height:1.5;color:${c.muted}">It works once and expires in ${CODE_TTL_MINUTES} minutes.</p>
      <p style="margin:0;font-size:13px;line-height:1.5;color:${c.faint}">If you did not ask to log in, you can ignore this — someone typed your address and got nowhere.</p>
    </div>
  </body>
</html>`;
}

export async function sendLoginCode({ to, code }: LoginCodeEmail): Promise<void> {
  const key = resendKey();

  if (!key) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "RESEND_API_KEY is not set — login codes cannot be delivered, so nobody can log in",
      );
    }
    // Local development with no provider: the code goes to the server log and
    // the API hands it back to the form. See canRevealCode.
    console.info(`[auth] login code for ${to}: ${code}`);
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromAddress(),
      to: [to],
      subject: `${code} is your Brigade code`,
      text: textBody(code),
      html: htmlBody(code),
      // Threads every code for one address together in Gmail rather than
      // stacking six near-identical mails in the inbox.
      headers: { "X-Entity-Ref-ID": `brigade-login-${to}` },
    }),
  });

  if (!response.ok) {
    // Resend's body says which of the three usual things went wrong — unverified
    // domain, bad key, invalid From. Logged, never returned to the browser.
    const detail = await response.text().catch(() => "");
    console.error(`[auth] resend rejected the login code: ${response.status} ${detail}`);
    throw new Error(`Could not send the login code (resend ${response.status})`);
  }
}
