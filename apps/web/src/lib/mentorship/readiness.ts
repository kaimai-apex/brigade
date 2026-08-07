/**
 * What a mentor still has to do before they can go live.
 *
 * One pure function, used by both the setup checklist and the publish gate on
 * the API. If these were written separately they would drift, and the failure
 * mode is the worst kind: a UI that says "ready" next to a button that returns
 * 400, or a checklist that lets someone publish a page nobody can book.
 *
 * No I/O — the caller reads the rows, this decides what they mean.
 *
 * Simplified publish path: name, title, location, description, what they offer,
 * and a Calendly link. Native hours / Stripe Connect are no longer required —
 * payment is platform-collected and scheduling happens on Calendly.
 */

export interface ReadinessInput {
  /** Profile display name (first + last). */
  name: string | null;
  headline: string | null;
  /** City / place string from the profile. */
  location: string | null;
  bio: string | null;
  /** What they want to share — free text or expertise tags. */
  mentorshipOffered: string | null;
  calendlyUrl: string | null;
}

export interface ChecklistItem {
  id: "name" | "title" | "location" | "description" | "offered" | "calendly";
  label: string;
  /** Blocks publishing when false. Advisory items are never blocking. */
  required: boolean;
  done: boolean;
  /** What to do about it, when it is not done. */
  hint: string;
}

export interface Readiness {
  items: ChecklistItem[];
  /** Required items that are still outstanding. */
  blocking: ChecklistItem[];
  canPublish: boolean;
  /** 0–100, counting advisory items too, so finishing them still feels like progress. */
  percentComplete: number;
}

export function evaluateReadiness(input: ReadinessInput): Readiness {
  const items: ChecklistItem[] = [
    {
      id: "name",
      label: "Your name",
      required: true,
      done: Boolean(input.name?.trim()),
      hint: "How you appear on your mentor card.",
    },
    {
      id: "title",
      label: "Title",
      required: true,
      done: Boolean(input.headline?.trim()),
      hint: "One line — your role or what you are known for.",
    },
    {
      id: "location",
      label: "Where you are based",
      required: true,
      done: Boolean(input.location?.trim()),
      hint: "City or region, so mentees know your context.",
    },
    {
      id: "description",
      label: "Description",
      required: true,
      done: Boolean(input.bio?.trim()),
      hint: "A short resume / about — who you are and your background.",
    },
    {
      id: "offered",
      label: "Mentorship offered",
      required: true,
      done: Boolean(input.mentorshipOffered?.trim()),
      hint: "What you want to share in sessions.",
    },
    {
      id: "calendly",
      label: "Calendly booking link",
      required: true,
      done: Boolean(input.calendlyUrl?.trim()),
      hint: "Mentees pay on Brigade, then pick a time on your Calendly.",
    },
  ];

  const blocking = items.filter((item) => item.required && !item.done);
  const done = items.filter((item) => item.done).length;

  return {
    items,
    blocking,
    canPublish: blocking.length === 0,
    percentComplete: Math.round((done / items.length) * 100),
  };
}

/** Legacy step slugs kept so old dashboard links still resolve to setup. */
export const SETUP_STEPS = [{ slug: "profile", label: "Your profile" }] as const;

export type SetupSlug = (typeof SETUP_STEPS)[number]["slug"];

export function stepIndex(_slug: string): number {
  return 0;
}
