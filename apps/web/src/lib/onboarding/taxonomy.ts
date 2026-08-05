/**
 * The vocabulary both sides of the marketplace speak.
 *
 * SCOPE: private chef mentorship, and nothing else. This MVP is for cooks and
 * chefs moving into — or already working in — private service: households,
 * estates, yachts, chalets, villas, events. Every list below is written for
 * that one journey.
 *
 * It deliberately does NOT cover bartending, front of house, sommeliers, hotel
 * operations or restaurant management. A directory that offers all of
 * hospitality and delivers four private chefs is worse than one that offers
 * private cheffing and delivers four private chefs.
 *
 * A mentee says "I want to get better at rates and pricing"; a mentor says "I
 * can teach rates and pricing". Those are only matchable if they are literally
 * the same string, so both flows pick from these lists and the matcher compares
 * them directly. Two hand-maintained lists would drift within a month — which
 * is why `SKILLS` is one array used by the mentee's "what do you want to
 * improve" screen AND the mentor's expertise picker.
 *
 * Pure data, no I/O, so the pairing can be asserted in a spec.
 */

/** Where private chefs actually work. The real segments of the job. */
export const INDUSTRIES = [
  "Private households",
  "Estates",
  "Yachts",
  "Chalets & ski season",
  "Villas & holiday lets",
  "Family offices",
  "Dinner parties & events",
  "Supper clubs & pop-ups",
  "Retreats",
  "Travelling with clients",
] as const;

/**
 * The matching backbone.
 *
 * Read as "I want to improve X" by a mentee and "I can teach X" by a mentor.
 * Every entry has to make sense read both ways, and has to be something a
 * private chef would actually name — that is the test for whether it belongs.
 */
export const SKILLS = [
  "Menu development",
  "Food costing",
  "Rates & pricing",
  "Finding clients",
  "Contracts & terms",
  "Dietary requirements",
  "Allergies & safety",
  "Sourcing & suppliers",
  "Meal prep & batch cooking",
  "Plating & presentation",
  "Wine & pairing",
  "Cooking in someone's home",
  "Working on a yacht",
  "Household staff dynamics",
  "Discretion & boundaries",
  "Trial cooks",
  "Going solo",
  "Marketing yourself",
  "Managing your time",
  "Budgeting for a household",
] as const;

/** What a mentee is trying to achieve. Mentee-only — mentors do not have goals. */
export const GOALS = [
  "Become a private chef",
  "Land my first private client",
  "Move from restaurants into private service",
  "Raise my rates",
  "Build a steady client base",
  "Get into yachts or estates",
  "Go full-time solo",
  "Cook for a season abroad",
  "Get better at the food",
  "Find someone who has done it",
] as const;

/**
 * The shape of help, as opposed to the subject of it.
 *
 * "Food costing" is a skill; "trial cook prep" is a format. Someone can be
 * expert in the subject and unwilling to do the format, so these are matched
 * separately and weighted lower than skills.
 *
 * No entry here may also appear in SKILLS. An exact duplicate would be scored
 * twice — once at skill weight, once at help weight — quietly making one
 * answer worth three times what the design intends. The spec asserts the two
 * lists stay disjoint, which is how the original "Finding clients" collision
 * was caught.
 */
export const HELP_TYPES = [
  "Career advice",
  "Trial cook prep",
  "Mock client call",
  "Rate negotiation",
  "Contract review",
  "Menu feedback",
  "Business strategy",
  "Technical cooking",
  "Portfolio review",
  "Life advice",
] as const;

/** "What best describes you?" — the private chef track, start to finish. */
export const HOSPITALITY_ROLES = [
  "Culinary student",
  "Aspiring private chef",
  "Commis chef",
  "Chef de partie",
  "Sous chef",
  "Head chef",
  "Personal chef",
  "Private chef",
  "Estate chef",
  "Yacht chef",
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
  { value: "student", label: "Culinary student", minYears: 0 },
  { value: "0-1", label: "0–1 years cooking", minYears: 0 },
  { value: "2-5", label: "2–5 years cooking", minYears: 2 },
  { value: "5-10", label: "5–10 years cooking", minYears: 5 },
  { value: "10+", label: "10+ years cooking", minYears: 10 },
] as const;

/** What a mentee wants from the person on the other side of the call. */
export const MENTOR_EXPERIENCE_PREFERENCE = [
  { value: "1-5", label: "1–5 years private", minYears: 1 },
  { value: "5-10", label: "5–10 years private", minYears: 5 },
  { value: "10+", label: "10+ years private", minYears: 10 },
  { value: "any", label: "No preference", minYears: 0 },
] as const;

/** Where someone cooks now. */
export const WORKPLACE_TYPES = [
  "Restaurant",
  "Private household",
  "Estate or villa",
  "Yacht",
  "Freelance / agency",
  "Culinary school",
  "Not working right now",
] as const;

/** Who a mentor wants to help — the mentor-side mirror of a mentee's stage. */
export const MENTEE_TYPES = [
  "Culinary students",
  "Restaurant chefs going private",
  "Chefs new to private service",
  "Established private chefs",
  "Chefs going solo",
  "Anyone who asks",
] as const;

export const SESSION_LENGTHS = [15, 30, 45, 60] as const;

/** Languages worth offering by default. Free text covers the rest. */
export const COMMON_LANGUAGES = [
  "English",
  "Spanish",
  "French",
  "Italian",
  "Portuguese",
  "German",
  "Mandarin",
  "Cantonese",
  "Japanese",
  "Arabic",
  "Russian",
  "Polish",
  "Tagalog",
  "Hindi",
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
