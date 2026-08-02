/**
 * iCalendar output for a confirmed session.
 *
 * A receipt that cannot be put in a calendar gets forgotten, and a mentorship
 * session missed because it lived only on a web page is a refund and a bad
 * review. Pure string building, so the escaping and folding rules can be tested
 * rather than eyeballed in a mail client.
 *
 * RFC 5545. The parts that actually bite:
 *  - lines end CRLF, and must be folded at 75 octets
 *  - `,` `;` `\` and newlines are escaped inside text values
 *  - timestamps are UTC with a trailing Z, no punctuation
 */

/** 20260805T140000Z */
export function toIcsTimestamp(date: Date): string {
  return `${date.toISOString().replace(/[-:]/g, "").split(".")[0]}Z`;
}

/** Escape a text value. Order matters: backslash first, or it escapes itself. */
export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/**
 * Fold a content line to 75 octets, continuing with a leading space.
 *
 * Counted in UTF-8 bytes, not characters: a line of accented text is longer on
 * the wire than it looks, and splitting mid-sequence produces mojibake in the
 * calendar client. The split point is walked back to a character boundary.
 */
export function foldIcsLine(line: string): string {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= 75) return line;

  const parts: string[] = [];
  let current = "";
  let currentBytes = 0;
  // First line allows 75 octets; continuation lines lose one to the leading space.
  let limit = 75;

  for (const char of line) {
    const size = encoder.encode(char).length;
    if (currentBytes + size > limit) {
      parts.push(current);
      current = "";
      currentBytes = 0;
      limit = 74;
    }
    current += char;
    currentBytes += size;
  }
  if (current) parts.push(current);

  return parts.join("\r\n ");
}

export interface CalendarEvent {
  bookingId: string;
  title: string;
  description: string;
  startsAt: Date;
  endsAt: Date;
  /** The meeting room, when one is known. */
  location?: string | null;
  /** Cancelled sessions are still worth sending, so the entry disappears. */
  cancelled?: boolean;
  organiserName?: string;
}

export function buildIcs(event: CalendarEvent, now = new Date()): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Brigade//Mentorship//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    // Stable across re-downloads, so a second download updates the existing
    // entry instead of creating a duplicate.
    `UID:booking-${event.bookingId}@joinbrigade.co`,
    `DTSTAMP:${toIcsTimestamp(now)}`,
    `DTSTART:${toIcsTimestamp(event.startsAt)}`,
    `DTEND:${toIcsTimestamp(event.endsAt)}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
    `DESCRIPTION:${escapeIcsText(event.description)}`,
    `STATUS:${event.cancelled ? "CANCELLED" : "CONFIRMED"}`,
  ];

  if (event.location) {
    lines.push(`LOCATION:${escapeIcsText(event.location)}`);
    // Some clients surface a URL property as a clickable "join" button where
    // they would only show LOCATION as plain text.
    lines.push(`URL:${escapeIcsText(event.location)}`);
  }
  if (event.organiserName) {
    lines.push(`ORGANIZER;CN=${escapeIcsText(event.organiserName)}:MAILTO:noreply@joinbrigade.co`);
  }

  lines.push("END:VEVENT", "END:VCALENDAR");

  return lines.map(foldIcsLine).join("\r\n") + "\r\n";
}
