import type { OptionControl } from "./disclosure";
import {
  COMMON_LANGUAGES,
  EXPERIENCE_LEVELS,
  GOALS,
  HELP_TYPES,
  HOSPITALITY_ROLES,
  INDUSTRIES,
  MENTOR_EXPERIENCE_PREFERENCE,
  SESSION_LENGTHS,
  SKILLS,
  WORKPLACE_TYPES,
} from "./taxonomy";

/**
 * The member onboarding flow, as data.
 *
 * One question per screen means roughly fifteen screens, and fifteen screens
 * written as fifteen page components is fifteen places for the save logic, the
 * progress maths and the skip behaviour to drift. Declaring them here and
 * rendering them with one component means a new question is three lines, and
 * every question behaves identically.
 *
 * Order is the flow, and order is all the progress bar needs: the percentage
 * is computed from position by `progress.ts`. It used to be written here, one
 * number per step copied from the PRD, and four consecutive questions shared a
 * value — so the bar stood still through four answers, which reads as broken.
 * A step's job is to be a question; how far along it is, is arithmetic.
 *
 * How a question is *shown* is not declared here. `controlFor` in disclosure.ts
 * derives it from the number of options, so a list that grows past the limit
 * collapses into a menu on its own rather than waiting for someone to remember
 * to change a flag.
 */

export type StepKind =
  /** Static screen, no input. */
  | "welcome"
  /** Pick exactly one from `options`. Advances on click. */
  | "single"
  /** Pick any number from `options`, up to `max`. */
  | "multi"
  /** Free text. */
  | "text"
  /** A small group of related short inputs — names, location, links. */
  | "fields"
  /** On/off rows. */
  | "toggles";

export interface StepField {
  /** Profile column, camelCased as `dbUpdateProfile` expects. */
  name: string;
  label: string;
  placeholder?: string;
  type?: "text" | "url" | "timezone";
}

export interface StepOption {
  value: string;
  label: string;
}

export interface MenteeStep {
  id: string;
  kind: StepKind;
  /** Shown in the progress rail. Several steps can share a phase. */
  phase: string;
  title: string;
  subtitle?: string;
  /** The profile column this step writes, for single/multi/text steps. */
  field?: string;
  options?: StepOption[];
  fields?: StepField[];
  /** Multi-select cap. Unbounded lists make poor matching signal. */
  max?: number;
  /**
   * Overrules `controlFor`, which otherwise decides from the option count.
   *
   * Set this only with a reason written next to it. A long list forced inline
   * is the exact thing the rule exists to prevent.
   */
  control?: OptionControl;
  /** Non-essential: a Skip control is offered. */
  optional?: boolean;
  /** Overrides the default "Continue". */
  cta?: string;
}

const asOptions = (values: readonly string[]): StepOption[] =>
  values.map((value) => ({ value, label: value }));

export const MENTEE_STEPS: MenteeStep[] = [
  {
    id: "welcome",
    kind: "welcome",
    phase: "Welcome",
    title: "Welcome to Brigade",
    // No duration in here. The welcome screen states one, computed from the
    // steps that actually exist, and a hand-written "about two minutes" sitting
    // next to a computed "about three" is the flow contradicting itself on the
    // first screen of the account.
    subtitle:
      "A few questions so we can point you at the right private chefs. Here is everything we will ask.",
    cta: "Let's go",
  },

  // --- Personal ------------------------------------------------------------
  {
    id: "name",
    kind: "fields",
    phase: "About you",
    title: "What should people call you?",
    optional: true,
    fields: [
      { name: "preferredName", label: "Preferred name", placeholder: "What you go by" },
      { name: "pronouns", label: "Pronouns", placeholder: "they/them" },
    ],
  },
  {
    id: "location",
    kind: "fields",
    phase: "About you",
    title: "Where are you based?",
    subtitle: "So we can show you mentors you can actually get on a call with.",
    fields: [
      { name: "city", label: "City", placeholder: "Toronto" },
      { name: "country", label: "Country", placeholder: "Canada" },
      { name: "timezone", label: "Timezone", type: "timezone" },
    ],
  },
  {
    id: "languages",
    kind: "multi",
    phase: "About you",
    title: "What languages do you speak?",
    subtitle: "Mentors who share one will rank higher for you.",
    field: "languages",
    options: asOptions(COMMON_LANGUAGES),
    max: 6,
    optional: true,
  },
  {
    id: "role",
    kind: "single",
    phase: "About you",
    title: "What best describes you?",
    field: "role",
    options: asOptions(HOSPITALITY_ROLES),
  },

  // --- Background ----------------------------------------------------------
  {
    id: "experience",
    kind: "single",
    phase: "Background",
    title: "Where are you in your career?",
    field: "experienceLevel",
    options: EXPERIENCE_LEVELS.map((level) => ({ value: level.value, label: level.label })),
  },
  {
    id: "workplace",
    kind: "single",
    phase: "Background",
    title: "Where do you work at the moment?",
    field: "workplaceType",
    options: asOptions(WORKPLACE_TYPES),
    optional: true,
  },
  {
    id: "job",
    kind: "fields",
    phase: "Background",
    title: "What do you do there?",
    optional: true,
    fields: [
      { name: "currentPosition", label: "Job title", placeholder: "Chef de partie" },
      { name: "currentEmployer", label: "Where", placeholder: "Restaurant, hotel or client" },
    ],
  },

  // --- Interests -----------------------------------------------------------
  {
    id: "industries",
    kind: "multi",
    phase: "Interests",
    title: "What kind of private work interests you?",
    subtitle: "Pick as many as apply. This shapes who we show you.",
    field: "interestIndustries",
    options: asOptions(INDUSTRIES),
    max: 6,
  },
  {
    id: "skills",
    kind: "multi",
    phase: "Interests",
    title: "What are you trying to get better at?",
    subtitle:
      "The most important question here — mentors answer this exact list about what they teach.",
    field: "skillsWanted",
    options: asOptions(SKILLS),
    max: 8,
  },

  // --- Goals ---------------------------------------------------------------
  {
    id: "goals",
    kind: "multi",
    phase: "Goals",
    title: "What are you hoping to achieve?",
    field: "goals",
    options: asOptions(GOALS),
    max: 5,
  },
  {
    id: "challenge",
    kind: "text",
    phase: "Goals",
    title: "What is holding you back right now?",
    subtitle:
      "In your own words. Mentors read this before a session — it is often the thing that makes someone say yes.",
    field: "biggestChallenge",
    optional: true,
  },

  // --- Mentorship preferences ---------------------------------------------
  {
    id: "help",
    kind: "multi",
    phase: "Mentorship",
    title: "How would you like a mentor to help?",
    field: "helpWanted",
    options: asOptions(HELP_TYPES),
    max: 5,
  },
  {
    id: "length",
    kind: "single",
    phase: "Mentorship",
    title: "How long should a session be?",
    field: "preferredSessionMinutes",
    options: SESSION_LENGTHS.map((minutes) => ({
      value: String(minutes),
      label: `${minutes} minutes`,
    })),
    optional: true,
  },
  {
    id: "seniority",
    kind: "single",
    phase: "Mentorship",
    title: "How experienced should they be?",
    field: "preferredMentorExperience",
    options: MENTOR_EXPERIENCE_PREFERENCE.map((entry) => ({
      value: entry.value,
      label: entry.label,
    })),
    optional: true,
  },

  // --- Profile -------------------------------------------------------------
  {
    id: "headline",
    kind: "fields",
    phase: "Your profile",
    title: "How would you introduce yourself?",
    subtitle: "This is what a mentor sees when you book them.",
    fields: [
      {
        name: "headline",
        label: "Headline",
        placeholder: "Private chef in Toronto, learning to cost a menu properly",
      },
    ],
  },
  {
    id: "links",
    kind: "fields",
    phase: "Your profile",
    title: "Anywhere people can see your work?",
    optional: true,
    fields: [
      { name: "linkedinUrl", label: "LinkedIn", placeholder: "https://…", type: "url" },
      { name: "instagramUrl", label: "Instagram", placeholder: "https://…", type: "url" },
      { name: "website", label: "Website", placeholder: "https://…", type: "url" },
    ],
  },
  {
    id: "availability",
    kind: "toggles",
    phase: "Your profile",
    title: "What are you open to?",
    optional: true,
    fields: [
      { name: "openToOpportunities", label: "Open to work" },
      { name: "availablePrivateEvents", label: "Private events and weddings" },
      { name: "availableContractWork", label: "Contract and gig work" },
    ],
  },
];

export function stepIndexById(id: string | null | undefined): number {
  if (!id) return 0;
  const index = MENTEE_STEPS.findIndex((step) => step.id === id);
  return index === -1 ? 0 : index;
}

