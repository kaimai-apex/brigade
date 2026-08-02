/**
 * The vocabulary both sides of the marketplace speak.
 *
 * A mentee says "I want to get better at food costing"; a mentor says "I can
 * teach food costing". Those are only matchable if they are literally the same
 * string, so both flows pick from these lists and the matcher compares them
 * directly. Two hand-maintained lists would drift within a month and the
 * matching would quietly degrade to nothing — which is why `SKILLS` is one
 * array used by the mentee's "what do you want to improve" screen AND the
 * mentor's expertise picker.
 *
 * Pure data, no I/O, so the pairing can be asserted in a spec.
 *
 * Free text is still allowed for mentor expertise: a chef who teaches something
 * nobody listed should not be silenced. Those tags simply cannot contribute to
 * a skills match until the same words appear on a mentee's side.
 */

/** Parts of the industry someone works in or wants to move into. */
export const INDUSTRIES = [
  "Private chef",
  "Restaurants",
  "Hotels",
  "Luxury hospitality",
  "Fine dining",
  "Catering",
  "Events",
  "Food trucks",
  "Bakeries",
  "Coffee",
  "Wine",
  "Cocktails",
  "Resorts",
  "Travel",
  "Cruise",
  "Hospitality tech",
  "Food content",
  "Hospitality startups",
] as const;

/**
 * The matching backbone.
 *
 * Read as "I want to improve X" by a mentee and "I can teach X" by a mentor.
 * Every entry has to make sense read both ways — that is the test for whether
 * something belongs here.
 */
export const SKILLS = [
  "Leadership",
  "Knife skills",
  "Menu development",
  "Food costing",
  "Business",
  "Networking",
  "Interview prep",
  "Career growth",
  "Personal branding",
  "Resume",
  "Pricing services",
  "Client acquisition",
  "Marketing",
  "Operations",
  "Hiring",
  "Management",
  "Financial literacy",
  "Communication",
  "Public speaking",
  "Going solo",
] as const;

/** What a mentee is trying to achieve. Mentee-only — mentors do not have goals. */
export const GOALS = [
  "Land my first hospitality job",
  "Become a private chef",
  "Get promoted",
  "Start my own business",
  "Open a restaurant",
  "Build my network",
  "Find a mentor",
  "Switch careers",
  "Learn from industry experts",
  "Improve technical skills",
] as const;

/**
 * The shape of help, as opposed to the subject of it.
 *
 * "Food costing" is a skill; "mock interviews" is a format. Someone can be
 * expert in the subject and unwilling to do the format, so these are matched
 * separately and weighted lower than skills.
 */
export const HELP_TYPES = [
  "Career advice",
  "Resume review",
  "Mock interviews",
  "Business strategy",
  "Networking",
  "Technical skills",
  "Pricing",
  "Finding clients",
  "Leadership",
  "Life advice",
] as const;

/** "What best describes you?" — the same list for both sides. */
export const HOSPITALITY_ROLES = [
  "Student",
  "Aspiring chef",
  "Private chef",
  "Line cook",
  "Pastry chef",
  "Restaurant manager",
  "Bartender",
  "Server",
  "Sommelier",
  "Hotel professional",
  "Event professional",
  "Caterer",
  "Hospitality entrepreneur",
  "Other",
] as const;

/**
 * Experience bands.
 *
 * `value` is what is stored and matched on; `minYears` lets a mentee's
 * "I want someone with 10+ years" be compared against a mentor's real
 * `years_experience` number without a second lookup table.
 */
export const EXPERIENCE_LEVELS = [
  { value: "exploring", label: "Just exploring", minYears: 0 },
  { value: "student", label: "Hospitality student", minYears: 0 },
  { value: "0-1", label: "0–1 years", minYears: 0 },
  { value: "2-5", label: "2–5 years", minYears: 2 },
  { value: "5-10", label: "5–10 years", minYears: 5 },
  { value: "10+", label: "10+ years", minYears: 10 },
] as const;

/** What a mentee wants from the person on the other side of the call. */
export const MENTOR_EXPERIENCE_PREFERENCE = [
  { value: "1-5", label: "1–5 years", minYears: 1 },
  { value: "5-10", label: "5–10 years", minYears: 5 },
  { value: "10+", label: "10+ years", minYears: 10 },
  { value: "any", label: "No preference", minYears: 0 },
] as const;

/** Where someone works now. */
export const WORKPLACE_TYPES = [
  "Restaurant",
  "Hotel",
  "Private chef",
  "Freelance",
  "Self-employed",
  "Not working",
] as const;

/** Who a mentor wants to help — the mentor-side mirror of a mentee's stage. */
export const MENTEE_TYPES = [
  "Students",
  "People just starting out",
  "Career changers",
  "Cooks stepping up to lead",
  "People going private",
  "Founders and owners",
  "Anyone who asks",
] as const;

export const SESSION_LENGTHS = [15, 30, 45, 60] as const;

/** Languages worth offering by default. Free text covers the rest. */
export const COMMON_LANGUAGES = [
  "English",
  "Spanish",
  "French",
  "Mandarin",
  "Cantonese",
  "Italian",
  "Portuguese",
  "German",
  "Japanese",
  "Korean",
  "Arabic",
  "Hindi",
  "Tagalog",
  "Vietnamese",
  "Polish",
  "Russian",
] as const;

export type Industry = (typeof INDUSTRIES)[number];
export type Skill = (typeof SKILLS)[number];
export type Goal = (typeof GOALS)[number];
export type HelpType = (typeof HELP_TYPES)[number];
export type MenteeType = (typeof MENTEE_TYPES)[number];

/**
 * Keep only values that are in a known list.
 *
 * Everything here arrives from a form and ends up in a text[] column that the
 * matcher and the directory facets both read, so an unbounded list of typos
 * would degrade discovery for everyone. Applied at the API boundary.
 */
export function keepKnown(values: unknown, allowed: readonly string[]): string[] {
  if (!Array.isArray(values)) return [];
  const set = new Set<string>(allowed);
  return Array.from(
    new Set(
      values
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim())
        .filter((value) => set.has(value)),
    ),
  );
}

/**
 * Same, but tolerating free text — used where the person genuinely may know
 * something the list does not name. Trimmed, de-duplicated case-insensitively
 * and capped, because these become directory facets.
 */
export function keepTags(values: unknown, max = 12): string[] {
  if (!Array.isArray(values)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
    if (out.length >= max) break;
  }
  return out;
}

/** Minimum years implied by a mentee's stated mentor preference. */
export function minYearsForPreference(value: string | null | undefined): number {
  const match = MENTOR_EXPERIENCE_PREFERENCE.find((entry) => entry.value === value);
  return match?.minYears ?? 0;
}
