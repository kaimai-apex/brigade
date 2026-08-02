/**
 * Ranking mentors for a member.
 *
 * Deliberately not embeddings. Every number below can be read, argued with and
 * tested, and it works the same on the day the directory has five mentors as it
 * will with five thousand — where a similarity model trained on nothing would
 * mostly return noise. It also means the UI can say WHY someone was suggested,
 * which is the difference between a recommendation and a slot machine.
 *
 * Pure functions over plain objects. No I/O, no clock, no randomness: the same
 * inputs always produce the same order, so a surprising result can be
 * reproduced in a spec rather than guessed at.
 *
 * Deliberately imports NOTHING, including the taxonomy. It compares strings and
 * numbers the caller hands it, which keeps the vocabulary free to change
 * without touching the ranking — and means a mentee's "10+ years" preference
 * arrives here already resolved to a number.
 */

/** Weights. Relative size is the design; the absolute values only set a scale. */
export const WEIGHTS = {
  /**
   * The strongest signal by far. A mentee saying "I want to get better at food
   * costing" and a mentor saying "I teach food costing" is the single most
   * useful thing either of them told us.
   */
  skill: 30,
  /**
   * The format of help, not the subject. Weaker than skills because a mentor
   * expert in the right thing is usually worth talking to even if they had not
   * ticked "mock interviews".
   */
  help: 12,
  /** Context. Restaurants and private cheffing are different worlds. */
  industry: 8,
  /** A mentor who wants this kind of mentee will show up differently. */
  menteeType: 10,
  /** Being able to speak comfortably matters more than people expect. */
  language: 6,
  /** Seniority the mentee actually asked for. */
  experience: 8,
  /** Overlapping working hours. Not decisive, but a 12-hour gap is real friction. */
  timezone: 6,
  /** Somebody has to be bookable. */
  hasSessions: 5,
} as const;

/** Diminishing returns: the 4th shared skill matters less than the 1st. */
const MAX_COUNTED_OVERLAP = 3;

export interface MenteeSignals {
  skillsWanted: string[];
  helpWanted: string[];
  interestIndustries: string[];
  languages: string[];
  timezone: string | null;
  /**
   * Already resolved from their stated preference by the caller, via the
   * taxonomy's `minYearsForPreference`. Zero means "no preference".
   */
  minMentorYears: number;
  /** Their own stage, matched against who a mentor wants to help. */
  experienceLevel: string | null;
}

export interface MentorSignals {
  userId: string;
  /** Answered from the same list as the mentee's skillsWanted. */
  expertise: string[];
  helpOffered: string[];
  industries: string[];
  languages: string[];
  menteeTypes: string[];
  timezone: string;
  yearsExperience: number | null;
  activeSessionCount: number;
}

export interface MatchReason {
  kind: "skill" | "help" | "industry" | "menteeType" | "language" | "experience" | "timezone";
  /** Shown to the member, e.g. "Food costing, Menu development". */
  label: string;
  points: number;
}

export interface MatchResult {
  mentorUserId: string;
  score: number;
  reasons: MatchReason[];
}

/** Case-insensitive intersection, preserving the mentee's wording for display. */
function overlap(a: string[], b: string[]): string[] {
  const other = new Set(b.map((value) => value.trim().toLowerCase()));
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of a) {
    const key = value.trim().toLowerCase();
    if (!key || seen.has(key) || !other.has(key)) continue;
    seen.add(key);
    out.push(value.trim());
  }
  return out;
}

/**
 * Score capped at MAX_COUNTED_OVERLAP.
 *
 * Without a cap, a mentor who ticked every box would outrank one who shares the
 * two things the mentee actually came for — the marketplace equivalent of
 * keyword stuffing.
 */
function overlapPoints(shared: string[], weight: number): number {
  return Math.min(shared.length, MAX_COUNTED_OVERLAP) * weight;
}

/**
 * How far apart two zones are, in hours, or null when either is unknown.
 *
 * Computed from the actual offsets today rather than a lookup table, so it
 * stays right across daylight saving. An invalid zone yields null rather than
 * throwing — a bad timezone string should cost a few points, not a page.
 */
export function timezoneDistanceHours(a: string | null, b: string | null): number | null {
  if (!a || !b) return null;
  try {
    const at = new Date();
    const offset = (zone: string) => {
      // Formatting the same instant in both zones and differencing is the only
      // approach that does not need a tz database of its own.
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: zone,
        hour12: false,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).formatToParts(at);
      const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
      return Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"));
    };
    return Math.abs(offset(a) - offset(b)) / 3_600_000;
  } catch {
    return null;
  }
}

export function scoreMentor(mentee: MenteeSignals, mentor: MentorSignals): MatchResult {
  const reasons: MatchReason[] = [];
  let score = 0;

  const add = (kind: MatchReason["kind"], label: string, points: number) => {
    if (points <= 0) return;
    score += points;
    reasons.push({ kind, label, points });
  };

  const skills = overlap(mentee.skillsWanted, mentor.expertise);
  add("skill", skills.join(", "), overlapPoints(skills, WEIGHTS.skill));

  const help = overlap(mentee.helpWanted, mentor.helpOffered);
  add("help", help.join(", "), overlapPoints(help, WEIGHTS.help));

  const industries = overlap(mentee.interestIndustries, mentor.industries);
  add("industry", industries.join(", "), overlapPoints(industries, WEIGHTS.industry));

  const languages = overlap(mentee.languages, mentor.languages);
  add("language", languages.join(", "), overlapPoints(languages, WEIGHTS.language));

  // "Anyone who asks" is a real answer and should not be penalised against a
  // mentor who named the mentee's exact stage.
  if (mentor.menteeTypes.length > 0) {
    const openToAll = mentor.menteeTypes.some(
      (value) => value.trim().toLowerCase() === "anyone who asks",
    );
    if (openToAll) {
      add("menteeType", "Open to anyone", WEIGHTS.menteeType / 2);
    } else if (mentee.experienceLevel) {
      const wanted = matchMenteeStage(mentee.experienceLevel, mentor.menteeTypes);
      if (wanted) add("menteeType", wanted, WEIGHTS.menteeType);
    }
  }

  if (mentee.minMentorYears > 0 && (mentor.yearsExperience ?? 0) >= mentee.minMentorYears) {
    add("experience", `${mentor.yearsExperience}+ years`, WEIGHTS.experience);
  }

  const distance = timezoneDistanceHours(mentee.timezone, mentor.timezone);
  if (distance !== null && distance <= 3) {
    // Within three hours there is a shared working day without anyone getting
    // up at 5am, which is what actually decides whether a session happens.
    add("timezone", distance < 1 ? "Same timezone" : "Similar hours", WEIGHTS.timezone);
  }

  if (mentor.activeSessionCount > 0) score += WEIGHTS.hasSessions;

  return { mentorUserId: mentor.userId, score, reasons };
}

/** Which of a mentor's stated mentee types covers this member's stage. */
function matchMenteeStage(experienceLevel: string, menteeTypes: string[]): string | null {
  const wanted: Record<string, string[]> = {
    exploring: ["Students", "People just starting out", "Career changers"],
    student: ["Students", "People just starting out"],
    "0-1": ["People just starting out", "Students"],
    "2-5": ["Cooks stepping up to lead", "Career changers"],
    "5-10": ["Cooks stepping up to lead", "People going private", "Founders and owners"],
    "10+": ["Founders and owners", "People going private"],
  };
  const candidates = wanted[experienceLevel] ?? [];
  const offered = new Set(menteeTypes.map((value) => value.trim().toLowerCase()));
  return candidates.find((value) => offered.has(value.toLowerCase())) ?? null;
}

/**
 * The score below which a suggestion is not worth making.
 *
 * A mentor who only "matched" on being bookable is not a recommendation, and
 * showing them as one teaches people to ignore the whole screen. Anything under
 * this is dropped and the caller falls back to browsing.
 */
export const MIN_USEFUL_SCORE = WEIGHTS.skill;

/** How many matches a "picked for you" section needs before it is honest. */
export const MIN_RECOMMENDATIONS = 3;

export interface RankedMatches {
  matches: MatchResult[];
  /** False when there is not enough signal to call these recommendations. */
  confident: boolean;
}

/**
 * Rank, then decide whether the result deserves to be called a recommendation.
 *
 * Two ways it does not: the member told us nothing to match on, or nobody
 * cleared the bar. Both are answered honestly by the caller showing the browse
 * grid instead — a "Mentors picked just for you" heading over three arbitrary
 * cards is worse than no heading.
 */
export function rankMentors(
  mentee: MenteeSignals,
  mentors: MentorSignals[],
  { limit = 12 }: { limit?: number } = {},
): RankedMatches {
  const toldUsSomething =
    mentee.skillsWanted.length > 0 ||
    mentee.helpWanted.length > 0 ||
    mentee.interestIndustries.length > 0;

  const matches = mentors
    .map((mentor) => scoreMentor(mentee, mentor))
    .filter((match) => match.score >= MIN_USEFUL_SCORE)
    // Ties broken by id so the order is stable between requests — a list that
    // reshuffles on refresh looks broken.
    .sort((a, b) => b.score - a.score || a.mentorUserId.localeCompare(b.mentorUserId))
    .slice(0, limit);

  return {
    matches,
    confident: toldUsSomething && matches.length >= MIN_RECOMMENDATIONS,
  };
}

/** One short line explaining a match, for the card. */
export function summariseReasons(reasons: MatchReason[]): string {
  const best = [...reasons].sort((a, b) => b.points - a.points)[0];
  if (!best) return "";
  switch (best.kind) {
    case "skill":
      return `Teaches ${best.label}`;
    case "help":
      return `Offers ${best.label.toLowerCase()}`;
    case "industry":
      return `Works in ${best.label.toLowerCase()}`;
    case "menteeType":
      return best.label;
    case "language":
      return `Speaks ${best.label}`;
    case "experience":
      return best.label;
    case "timezone":
      return best.label;
  }
}
