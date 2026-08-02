/**
 * What a mentor still has to do before they can go live.
 *
 * One pure function, used by both the setup checklist and the publish gate on
 * the API. If these were written separately they would drift, and the failure
 * mode is the worst kind: a UI that says "ready" next to a button that returns
 * 400, or a checklist that lets someone publish a page nobody can book.
 *
 * No I/O — the caller reads the rows, this decides what they mean.
 */

export interface ReadinessInput {
  headline: string | null;
  bio: string | null;
  expertise: string[];
  /** Only the sellable ones. An inactive session type is not an offer. */
  activeSessionCount: number;
  /** True when at least one active session costs money. */
  hasPaidSession: boolean;
  weeklyWindowCount: number;
  defaultMeetingUrl: string | null;
  payoutsEnabled: boolean;
  /** False on a deployment with no Stripe keys at all. */
  paymentsConfigured: boolean;
}

export interface ChecklistItem {
  id: "profile" | "sessions" | "hours" | "meeting" | "payouts" | "tags";
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
  const hasProfile = Boolean(input.headline?.trim()) && Boolean(input.bio?.trim());

  /**
   * Payouts are only required once there is something to be paid FOR.
   *
   * A mentor offering a free intro call has no money to route, so demanding
   * Stripe onboarding would block them for no reason. And on a deployment with
   * no Stripe keys, requiring it would make publishing impossible for everyone
   * — which is how the marketplace ends up empty.
   */
  const payoutsRequired = input.hasPaidSession && input.paymentsConfigured;

  const items: ChecklistItem[] = [
    {
      id: "profile",
      label: "Introduce yourself",
      required: true,
      done: hasProfile,
      hint: "A headline and a few lines on what people get out of a session with you.",
    },
    {
      id: "sessions",
      label: "Set your prices",
      required: true,
      done: input.activeSessionCount > 0,
      hint: "Add at least one session — what it covers, how long it runs, what it costs.",
    },
    {
      id: "hours",
      label: "Choose your hours",
      required: true,
      done: input.weeklyWindowCount > 0,
      hint: "Weekly windows when you are free. Nobody can book you without them.",
    },
    {
      id: "payouts",
      label: "Get paid",
      required: payoutsRequired,
      done: input.payoutsEnabled,
      hint: input.paymentsConfigured
        ? "Connect a Stripe account so the money from a booking reaches your bank."
        : "Payments are not switched on for this deployment yet.",
    },
    {
      id: "tags",
      label: "Say what you teach",
      /**
       * Advisory, not blocking.
       *
       * Tags are the main way people find a mentor — the directory filters and
       * facets resolve to them — so leaving them empty is a real handicap. But
       * a mentor with a good headline and an open calendar is still worth
       * listing, and discovery falls back to their profile's expertise areas,
       * so refusing to publish over this would keep useful people off the site.
       */
      required: false,
      done: input.expertise.length > 0,
      hint: "The subjects you want to be found for. Without them you rely on your profile's.",
    },
    {
      id: "meeting",
      label: "Add your meeting link",
      // Advisory: a mentor can add the link per booking instead, and blocking
      // publication on it would keep an otherwise-ready mentor off the site.
      required: false,
      done: Boolean(input.defaultMeetingUrl?.trim()),
      hint: "Your Calendly, Meet, Zoom or Whereby room. Sent to the other person once they pay.",
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

/** The setup flow's steps, in order. Index matches `mentors.onboarding_step`. */
export const SETUP_STEPS = [
  { slug: "profile", label: "Your profile" },
  { slug: "sessions", label: "Sessions & pricing" },
  { slug: "hours", label: "Availability" },
  { slug: "meeting", label: "Meeting link" },
  { slug: "payouts", label: "Get paid" },
  { slug: "review", label: "Review & publish" },
] as const;

export type SetupSlug = (typeof SETUP_STEPS)[number]["slug"];

export function stepIndex(slug: string): number {
  const index = SETUP_STEPS.findIndex((step) => step.slug === slug);
  return index === -1 ? 0 : index;
}
