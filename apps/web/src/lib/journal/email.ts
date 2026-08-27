export const JOURNAL_UNLOCK_COOKIE = "brigade_journal_unlock";
export const JOURNAL_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeJournalEmail(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const email = raw.trim().toLowerCase();
  if (!email || !JOURNAL_EMAIL_RE.test(email) || email.length > 254) return null;
  return email;
}
