/**
 * Reminder email to a mentor after a mentee pays for a session.
 *
 * Same Resend transport as login codes — fails soft (log) so a mail outage
 * never rolls back a confirmed Stripe payment.
 */

import { EMAIL_COLORS } from "@/lib/design/tokens";
import { getSiteUrl } from "@/lib/site-url";

export interface MentorBookingEmail {
  to: string;
  mentorName?: string;
  menteeName?: string | null;
  menteeEmail?: string | null;
  sessionTitle?: string | null;
  startsAt?: string | null;
  calendlyUrl?: string | null;
  bookingId: string;
}

function resendKey() {
  return process.env.RESEND_API_KEY?.trim() || "";
}

function fromAddress() {
  return process.env.RESEND_FROM?.trim() || "Brigade <hello@joinbrigade.co>";
}

function formatWhen(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);
}

function textBody(input: MentorBookingEmail): string {
  const when = formatWhen(input.startsAt);
  const sessionsUrl = `${getSiteUrl()}/sessions`;
  const lines = [
    input.mentorName ? `Hi ${input.mentorName},` : "Hi,",
    ``,
    `A mentee paid for a session with you on Brigade.`,
    ``,
  ];
  if (input.menteeName) lines.push(`Mentee: ${input.menteeName}`);
  if (input.menteeEmail) lines.push(`Email: ${input.menteeEmail}`);
  if (input.sessionTitle) lines.push(`Session: ${input.sessionTitle}`);
  if (when) {
    lines.push(`Placeholder time on Brigade: ${when}`);
    lines.push(`(They may still pick the real slot on Calendly.)`);
  }
  if (input.calendlyUrl) {
    lines.push(``);
    lines.push(`Your Calendly link (shared with them after payment):`);
    lines.push(input.calendlyUrl);
  }
  lines.push(``);
  lines.push(`Open your sessions dashboard:`);
  lines.push(sessionsUrl);
  lines.push(``);
  lines.push(`— Brigade`);
  return lines.join("\n");
}

function htmlBody(input: MentorBookingEmail): string {
  const c = EMAIL_COLORS;
  const when = formatWhen(input.startsAt);
  const sessionsUrl = `${getSiteUrl()}/sessions`;
  const rows: string[] = [];
  if (input.menteeName) {
    rows.push(`<p style="margin:0 0 8px;font-size:15px;line-height:1.5"><strong>Mentee:</strong> ${escapeHtml(input.menteeName)}</p>`);
  }
  if (input.menteeEmail) {
    rows.push(`<p style="margin:0 0 8px;font-size:15px;line-height:1.5"><strong>Email:</strong> ${escapeHtml(input.menteeEmail)}</p>`);
  }
  if (input.sessionTitle) {
    rows.push(`<p style="margin:0 0 8px;font-size:15px;line-height:1.5"><strong>Session:</strong> ${escapeHtml(input.sessionTitle)}</p>`);
  }
  if (when) {
    rows.push(`<p style="margin:0 0 8px;font-size:15px;line-height:1.5"><strong>Time on Brigade:</strong> ${escapeHtml(when)}</p>`);
    rows.push(`<p style="margin:0 0 16px;font-size:13px;line-height:1.5;color:${c.muted}">They may still pick the real slot on Calendly.</p>`);
  }
  if (input.calendlyUrl) {
    rows.push(
      `<p style="margin:0 0 8px;font-size:15px;line-height:1.5"><strong>Calendly:</strong> <a href="${escapeAttr(input.calendlyUrl)}" style="color:${c.text}">${escapeHtml(input.calendlyUrl)}</a></p>`,
    );
  }

  return `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:${c.background};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:${c.text}">
    <div style="max-width:480px;margin:0 auto">
      <p style="margin:0 0 16px;font-size:15px;line-height:1.5">${input.mentorName ? `Hi ${escapeHtml(input.mentorName)},` : "Hi,"}</p>
      <p style="margin:0 0 20px;font-size:15px;line-height:1.5">A mentee paid for a session with you on Brigade.</p>
      ${rows.join("")}
      <p style="margin:24px 0 0">
        <a href="${escapeAttr(sessionsUrl)}" style="display:inline-block;padding:12px 18px;background:${c.text};color:${c.background};text-decoration:none;border-radius:10px;font-size:14px;font-weight:600">View sessions</a>
      </p>
      <p style="margin:24px 0 0;font-size:13px;line-height:1.5;color:${c.faint}">— Brigade</p>
    </div>
  </body>
</html>`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(value: string) {
  return escapeHtml(value).replace(/'/g, "&#39;");
}

/**
 * Best-effort send. Logs and returns on failure — never throws into the
 * Stripe webhook after money has already moved.
 */
export async function sendMentorBookingReminder(input: MentorBookingEmail): Promise<void> {
  const key = resendKey();
  if (!key) {
    console.info(
      `[mentorship] mentor booking email (no RESEND_API_KEY) to=${input.to} booking=${input.bookingId}`,
    );
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
        to: [input.to],
        subject: input.menteeName
          ? `${input.menteeName} booked a session with you`
          : "Someone booked a session with you",
        text: textBody(input),
        html: htmlBody(input),
        headers: { "X-Entity-Ref-ID": `brigade-mentor-booking-${input.bookingId}` },
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.error(
        `[mentorship] resend rejected mentor booking email: ${response.status} ${detail}`,
      );
    }
  } catch (error) {
    console.error(
      "[mentorship] could not send mentor booking email:",
      error instanceof Error ? error.message : error,
    );
  }
}
