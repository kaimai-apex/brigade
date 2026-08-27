import { EMAIL_COLORS } from "@/lib/design/tokens";

/**
 * Application decision emails.
 *
 * Same shape as lib/auth/send-login-code.ts — one POST to Resend's REST API
 * over fetch, no SDK. It differs in one important way: a decision email is
 * NOT load-bearing the way a login code is. If it fails to send, the decision
 * has still been recorded and the applicant can see it on their status page, so
 * this logs and returns rather than throwing and rolling back a review an admin
 * has already made.
 */

type DecisionKind = "submitted" | "accepted" | "waitlisted" | "rejected" | "interview";

function resendKey() {
  return process.env.RESEND_API_KEY?.trim() || "";
}

function fromAddress() {
  return process.env.RESEND_FROM?.trim() || "Brigade <hello@joinbrigade.co>";
}

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://joinbrigade.co";
}

const COPY: Record<DecisionKind, { subject: string; heading: string; lines: string[]; cta?: string }> = {
  submitted: {
    subject: "We've got your Brigade application",
    heading: "Application received",
    lines: [
      "Thanks for applying to the Brigade Private Chef Accelerator.",
      "We read every application ourselves. Expect to hear back within about a week.",
    ],
    cta: "Check your status",
  },
  interview: {
    subject: "Let's talk about your application",
    heading: "We'd like to talk",
    lines: [
      "We've read your application and we'd like to get on a call.",
      "Reply to this email with a couple of times that work and we'll set it up.",
    ],
  },
  accepted: {
    subject: "You're in",
    heading: "You're in",
    lines: [
      "We'd like to offer you a place in the next Brigade Private Chef Accelerator.",
      "Your next step is to confirm your place and finish setting up your profile.",
    ],
    cta: "Confirm your place",
  },
  waitlisted: {
    subject: "You're on the Brigade waitlist",
    heading: "You're on the waitlist",
    lines: [
      "This cohort filled up before we could place you.",
      "You're first in line when the next one opens. We'll email you before it goes public.",
    ],
  },
  rejected: {
    subject: "Your Brigade application",
    heading: "Not this time",
    lines: [
      "We're not able to offer you a place in this cohort.",
      "This is about fit with this particular group, not about your cooking. You're welcome to apply again for a future cohort.",
    ],
  },
};

function textBody(kind: DecisionKind): string {
  const copy = COPY[kind];
  return [copy.heading, "", ...copy.lines, "", `${siteUrl()}/apply`].join("\n");
}

function htmlBody(kind: DecisionKind): string {
  const copy = COPY[kind];
  const paragraphs = copy.lines
    .map(
      (line) =>
        `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:${EMAIL_COLORS.muted}">${line}</p>`,
    )
    .join("");
  const button = copy.cta
    ? `<p style="margin:24px 0 0"><a href="${siteUrl()}/apply" style="display:inline-block;background:${EMAIL_COLORS.text};color:${EMAIL_COLORS.background};text-decoration:none;padding:12px 20px;border-radius:999px;font-size:15px;font-weight:600">${copy.cta}</a></p>`
    : "";

  return `<!doctype html>
<html>
  <body style="margin:0;padding:32px 16px;background:${EMAIL_COLORS.background}">
    <div style="max-width:520px;margin:0 auto;font-family:Helvetica,Arial,sans-serif">
      <p style="margin:0 0 24px;font-size:13px;letter-spacing:1px;color:${EMAIL_COLORS.faint}">BRIGADE</p>
      <h1 style="margin:0 0 16px;font-size:26px;line-height:1.2;color:${EMAIL_COLORS.text}">${copy.heading}</h1>
      ${paragraphs}
      ${button}
    </div>
  </body>
</html>`;
}

export async function sendApplicationEmail(params: {
  to: string;
  kind: DecisionKind;
}): Promise<void> {
  const key = resendKey();
  const copy = COPY[params.kind];

  if (!key) {
    console.info(`[academy] would email ${params.to}: ${copy.subject}`);
    return;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress(),
        to: [params.to],
        subject: copy.subject,
        text: textBody(params.kind),
        html: htmlBody(params.kind),
      }),
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.error(
        `[academy] resend rejected the ${params.kind} email: ${response.status} ${detail}`,
      );
    }
  } catch (error) {
    // Never let a mail outage undo a decision that is already in the database.
    console.error("[academy] could not send application email", error);
  }
}
