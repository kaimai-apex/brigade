import type { Readiness } from "@/lib/mentorship/readiness";
import type { AvailabilityRule } from "@/lib/mentorship/availability";

/**
 * The shapes the setup flow passes around.
 *
 * Declared here rather than imported from the server data layer: that module
 * pulls in a Postgres driver, and these are client components.
 */

export interface SetupMentor {
  userId: string;
  headline: string | null;
  bio: string | null;
  timezone: string;
  currency: string;
  status: "draft" | "active" | "paused";
  minNoticeHours: number;
  bookingHorizonDays: number;
  payoutsEnabled: boolean;
  defaultMeetingUrl: string | null;
  expertise: string[];
  onboardingStep: number;
  payoutAccountId: string | null;
  /** The mentor half of the matching pairs — see lib/onboarding/taxonomy.ts. */
  menteeTypes: string[];
  helpOffered: string[];
  industries: string[];
  languages: string[];
}

export interface SetupSessionType {
  id: string;
  title: string;
  description: string | null;
  durationMinutes: number;
  priceCents: number;
  active: boolean;
}

export interface SetupProfile {
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  role: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  currentEmployer: string | null;
  yearsExperience: number | null;
}

/**
 * Unsaved edits, so the preview can move while someone is still typing.
 *
 * Kept separate from the saved mentor rather than merged into it, so there is
 * never a moment where the app cannot tell what is actually stored.
 */
export interface SetupDraft {
  headline?: string;
  bio?: string;
  expertise?: string[];
  defaultMeetingUrl?: string;
}

export interface SetupState {
  mentor: SetupMentor | null;
  sessionTypes: SetupSessionType[];
  availability: AvailabilityRule[];
  profile: SetupProfile;
  readiness: Readiness | null;
  paymentsConfigured: boolean;
  draft: SetupDraft;
}

/** Every step gets the same props, so the orchestrator stays uniform. */
export interface StepProps {
  state: SetupState;
  /** Patch the mentor row and refresh. Resolves false when the save failed. */
  save: (patch: Record<string, unknown>) => Promise<boolean>;
  reload: () => Promise<void>;
  /** Report unsaved edits so the preview keeps up with the form. */
  setDraft: (patch: SetupDraft) => void;
  saving: boolean;
  onNext: () => void;
}
