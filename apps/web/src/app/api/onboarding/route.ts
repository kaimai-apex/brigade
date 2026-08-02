import { NextResponse } from "next/server";
import { getConnectProSession } from "@/lib/connectpro/server";
import { dbGetProfile, dbUpdateProfile } from "@/lib/server/profile-db";
import {
  COMMON_LANGUAGES,
  GOALS,
  HELP_TYPES,
  HOSPITALITY_ROLES,
  INDUSTRIES,
  MENTOR_EXPERIENCE_PREFERENCE,
  SKILLS,
  WORKPLACE_TYPES,
  EXPERIENCE_LEVELS,
  keepKnown,
  keepTags,
} from "@/lib/onboarding/taxonomy";

/**
 * Auto-save for the member onboarding flow.
 *
 * One answer at a time, saved as it is given, because the flow is fifteen
 * screens long and nobody should lose ten of them to a closed tab. That also
 * makes every step resumable for free: the next visit reads the profile back.
 *
 * Everything that lands in a text[] the matcher reads is filtered against the
 * shared taxonomy first. These columns are also directory facets — one typo'd
 * value from a hand-rolled request would sit in the filter list forever.
 */

/** Free text is fine here; these are the member's own words or their own links. */
const FREE_TEXT = new Set([
  "preferredName",
  "pronouns",
  "timezone",
  "city",
  "country",
  "currentPosition",
  "currentEmployer",
  "headline",
  "biggestChallenge",
  "linkedinUrl",
  "instagramUrl",
  "website",
]);

const BOOLEANS = new Set([
  "openToOpportunities",
  "availablePrivateEvents",
  "availableContractWork",
]);

/** Single-choice fields, and the list each is checked against. */
const CHOICES: Record<string, readonly string[]> = {
  role: HOSPITALITY_ROLES,
  workplaceType: WORKPLACE_TYPES,
  experienceLevel: EXPERIENCE_LEVELS.map((level) => level.value),
  preferredMentorExperience: MENTOR_EXPERIENCE_PREFERENCE.map((entry) => entry.value),
};

/** Multi-choice fields, and the list each is filtered against. */
const LISTS: Record<string, readonly string[]> = {
  skillsWanted: SKILLS,
  helpWanted: HELP_TYPES,
  interestIndustries: INDUSTRIES,
  goals: GOALS,
};

export async function PATCH(request: Request) {
  const session = await getConnectProSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const patch: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(body)) {
    if (FREE_TEXT.has(key)) {
      if (typeof value === "string") patch[key] = value.trim() || null;
      continue;
    }
    if (BOOLEANS.has(key)) {
      if (typeof value === "boolean") patch[key] = value;
      continue;
    }
    if (key in CHOICES) {
      // An unrecognised choice is dropped rather than stored: it would show up
      // as a directory filter nobody can match.
      if (typeof value === "string" && CHOICES[key].includes(value)) patch[key] = value;
      continue;
    }
    if (key in LISTS) {
      patch[key] = keepKnown(value, LISTS[key]);
      continue;
    }
    if (key === "languages") {
      // Suggested list, but someone may genuinely speak something not on it.
      patch[key] = keepTags(value, 6).filter(
        (language) =>
          COMMON_LANGUAGES.includes(language as (typeof COMMON_LANGUAGES)[number]) ||
          language.length <= 30,
      );
      continue;
    }
    if (key === "preferredSessionMinutes") {
      const minutes = Number(value);
      if (Number.isInteger(minutes) && minutes >= 15 && minutes <= 480) {
        patch[key] = minutes;
      }
      continue;
    }
    // Anything else is ignored rather than 400'd — the flow saves optimistically
    // and a rejected keystroke must not stall it.
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ ok: true, saved: 0 });
  }

  try {
    await dbUpdateProfile(session.userId, patch);
    return NextResponse.json({ ok: true, saved: Object.keys(patch).length });
  } catch (error) {
    console.error("[onboarding save]", error instanceof Error ? error.message : error);
    return NextResponse.json({ message: "Could not save that" }, { status: 500 });
  }
}

/** What the flow needs to resume: the answers so far. */
export async function GET() {
  const session = await getConnectProSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const profile = await dbGetProfile(session.userId);
  if (!profile) return NextResponse.json({ message: "No profile" }, { status: 404 });

  return NextResponse.json(profile, { headers: { "Cache-Control": "no-store" } });
}
