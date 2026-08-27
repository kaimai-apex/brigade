/**
 * The application question set.
 *
 * Defined as data rather than markup so the same definition drives the form,
 * the server-side validation, and the admin review screen — an answer can only
 * be stored if a question here asked for it, and admin renders every answer by
 * walking this list rather than hard-coding labels that drift out of step.
 *
 * Answers are stored as JSONB keyed by `id` (academy.applications.answers), so
 * these ids are persisted data: rename one and old applications lose that
 * answer. Add new questions instead.
 */

export type ApplicationQuestion = {
  id: string;
  section: string;
  label: string;
  help?: string;
  kind: "short" | "long" | "number" | "select";
  required: boolean;
  options?: readonly string[];
  maxLength?: number;
  placeholder?: string;
};

export const TRAVEL_WILLINGNESS = [
  "Local only",
  "Regional / drivable",
  "Nationwide",
  "International",
] as const;

export const AVAILABILITY_OPTIONS = [
  "Immediately",
  "Within a month",
  "In 1–3 months",
  "Just exploring for now",
] as const;

export const REFERRAL_SOURCES = [
  "Instagram",
  "A friend or colleague",
  "One of the mentors",
  "Google search",
  "The Brigade journal",
  "Somewhere else",
] as const;

export const APPLICATION_QUESTIONS: readonly ApplicationQuestion[] = [
  // -- Culinary background ---------------------------------------------------
  {
    id: "yearsExperience",
    section: "Your background",
    label: "Years cooking professionally",
    kind: "number",
    required: true,
  },
  {
    id: "currentPosition",
    section: "Your background",
    label: "Current position",
    kind: "short",
    required: true,
    maxLength: 160,
    placeholder: "Sous Chef",
  },
  {
    id: "currentEmployer",
    section: "Your background",
    label: "Where you work now",
    kind: "short",
    required: false,
    maxLength: 160,
    placeholder: "Alo, Toronto",
  },
  {
    id: "kitchens",
    section: "Your background",
    label: "Kitchens you've worked in",
    help: "The places that shaped how you cook. Names and roughly when.",
    kind: "long",
    required: true,
    maxLength: 2000,
  },
  {
    id: "location",
    section: "Your background",
    label: "Where you're based",
    kind: "short",
    required: true,
    maxLength: 160,
    placeholder: "Toronto, ON",
  },
  {
    id: "cuisines",
    section: "Your background",
    label: "What you cook best",
    help: "Cuisines, techniques, or the thing people ask you for.",
    kind: "long",
    required: true,
    maxLength: 600,
  },

  // -- Motivation ------------------------------------------------------------
  {
    id: "whyPrivate",
    section: "Why this",
    label: "Why private cheffing?",
    kind: "long",
    required: true,
    maxLength: 2000,
  },
  {
    id: "whyNow",
    section: "Why this",
    label: "Why now?",
    kind: "long",
    required: true,
    maxLength: 2000,
  },
  {
    id: "goal",
    section: "Why this",
    label: "What do you want to be true a year from now?",
    kind: "long",
    required: true,
    maxLength: 2000,
  },

  // -- Fit -------------------------------------------------------------------
  {
    id: "availability",
    section: "Fit",
    label: "When could you start taking private work?",
    kind: "select",
    required: true,
    options: AVAILABILITY_OPTIONS,
  },
  {
    id: "travel",
    section: "Fit",
    label: "How far will you travel for a client?",
    kind: "select",
    required: true,
    options: TRAVEL_WILLINGNESS,
  },
  {
    id: "existingClients",
    section: "Fit",
    label: "Do you cook privately for anyone already?",
    help: "Be honest. Starting from zero is normal and is not a mark against you.",
    kind: "long",
    required: false,
    maxLength: 1000,
  },
  {
    id: "referralSource",
    section: "Fit",
    label: "How did you hear about Brigade?",
    kind: "select",
    required: true,
    options: REFERRAL_SOURCES,
  },
] as const;

export const QUESTIONS_BY_ID = new Map(
  APPLICATION_QUESTIONS.map((question) => [question.id, question]),
);

/** Sections in the order they should be rendered, with their questions. */
export function applicationSections(): { title: string; questions: ApplicationQuestion[] }[] {
  const order: string[] = [];
  const bySection = new Map<string, ApplicationQuestion[]>();
  for (const question of APPLICATION_QUESTIONS) {
    if (!bySection.has(question.section)) {
      bySection.set(question.section, []);
      order.push(question.section);
    }
    bySection.get(question.section)!.push(question);
  }
  return order.map((title) => ({ title, questions: bySection.get(title)! }));
}

export type ApplicationAnswers = Record<string, string | number>;

/**
 * Validate and coerce a submitted answer set against the question list.
 *
 * Returns the cleaned answers, or the ids that are missing/invalid. Unknown
 * keys are dropped rather than rejected: a stale client posting a removed
 * question should not be told its application is broken.
 */
export function validateAnswers(
  raw: Record<string, unknown>,
): { ok: true; answers: ApplicationAnswers } | { ok: false; invalid: string[] } {
  const answers: ApplicationAnswers = {};
  const invalid: string[] = [];

  for (const question of APPLICATION_QUESTIONS) {
    const value = raw[question.id];

    if (question.kind === "number") {
      const parsed = typeof value === "number" ? value : Number(value);
      if (!Number.isFinite(parsed) || parsed < 0 || parsed > 70) {
        if (question.required) invalid.push(question.id);
        continue;
      }
      answers[question.id] = Math.round(parsed);
      continue;
    }

    const text = typeof value === "string" ? value.trim() : "";
    if (!text) {
      if (question.required) invalid.push(question.id);
      continue;
    }

    if (question.kind === "select") {
      if (!question.options?.includes(text)) {
        invalid.push(question.id);
        continue;
      }
      answers[question.id] = text;
      continue;
    }

    answers[question.id] = text.slice(0, question.maxLength ?? 2000);
  }

  return invalid.length > 0 ? { ok: false, invalid } : { ok: true, answers };
}

/** How an application status reads to the applicant. */
export const APPLICANT_STATUS_COPY: Record<string, { title: string; body: string }> = {
  draft: {
    title: "Your application is saved",
    body: "You haven't sent it yet. Pick up where you left off whenever you're ready.",
  },
  submitted: {
    title: "Application received",
    body: "We read every one. Expect to hear back within about a week.",
  },
  under_review: {
    title: "We're reading your application",
    body: "One of the mentors is going through it now.",
  },
  interview: {
    title: "We'd like to talk",
    body: "We'll be in touch by email to find a time for a short call.",
  },
  accepted: {
    title: "You're in",
    body: "Welcome to the Accelerator. Your next step is below.",
  },
  waitlisted: {
    title: "You're on the waitlist",
    body: "This cohort filled up. We'll come to you first when the next one opens.",
  },
  rejected: {
    title: "Not this time",
    body: "We're not able to offer you a place in this cohort. You're welcome to apply again.",
  },
};
