import { NextResponse } from "next/server";
import { getConnectProSession } from "@/lib/connectpro/server";
import {
  dbGetMentor,
  dbUpsertMentor,
  dbListSessionTypes,
  dbListAvailabilityRules,
  dbListExceptions,
  normaliseMeetingUrl,
} from "@/lib/server/mentorship-db";
import { paymentsConfigured, paymentsFullyConfigured } from "@/lib/server/payments";
import { evaluateReadiness, SETUP_STEPS } from "@/lib/mentorship/readiness";
import { getPool } from "@connectpro/common";
import {
  COMMON_LANGUAGES,
  HELP_TYPES,
  INDUSTRIES,
  MENTEE_TYPES,
  keepKnown,
  keepTags,
} from "@/lib/onboarding/taxonomy";

/** The caller's own mentor setup, or null if they have not started one. */
export async function GET() {
  const session = await getConnectProSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const mentor = await dbGetMentor(session.userId);
    if (!mentor) {
      return NextResponse.json({
        mentor: null,
        paymentsConfigured: paymentsConfigured(),
        takingPayments: paymentsFullyConfigured(),
      });
    }
    const [sessionTypes, availability, exceptions] = await Promise.all([
      dbListSessionTypes(session.userId, { activeOnly: false }),
      dbListAvailabilityRules(session.userId),
      dbListExceptions(session.userId),
    ]);

    const active = sessionTypes.filter((type) => type.active);
    const readiness = evaluateReadiness({
      headline: mentor.headline,
      bio: mentor.bio,
      expertise: mentor.expertise,
      activeSessionCount: active.length,
      hasPaidSession: active.some((type) => type.priceCents > 0),
      weeklyWindowCount: availability.length,
      defaultMeetingUrl: mentor.defaultMeetingUrl,
      payoutsEnabled: mentor.payoutsEnabled,
      paymentsConfigured: paymentsConfigured(),
    });

    // The card preview in the setup flow renders the real ExploreCard, which
    // needs the profile half of a listing: name, photo, role, place. Returned
    // here so the flow does not have to make a second round trip on every keystroke.
    const profileRes = await getPool().query(
      `SELECT first_name, last_name, avatar_url, role, city, state, country,
              current_employer, years_experience
         FROM users.profiles WHERE user_id = $1`,
      [session.userId],
    );
    const p = profileRes.rows[0] ?? {};

    return NextResponse.json({
      mentor,
      sessionTypes,
      availability,
      exceptions,
      readiness,
      profile: {
        firstName: p.first_name ?? null,
        lastName: p.last_name ?? null,
        avatarUrl: p.avatar_url ?? null,
        role: p.role ?? null,
        city: p.city ?? null,
        state: p.state ?? null,
        country: p.country ?? null,
        currentEmployer: p.current_employer ?? null,
        yearsExperience:
          p.years_experience === null || p.years_experience === undefined
            ? null
            : Number(p.years_experience),
      },
      paymentsConfigured: paymentsConfigured(),
      takingPayments: paymentsFullyConfigured(),
    });
  } catch (error) {
    console.error("[mentorship/me]", error instanceof Error ? error.message : error);
    return NextResponse.json({ message: "Could not load your mentor profile" }, { status: 500 });
  }
}

/** Create or update it. */
export async function PUT(request: Request) {
  const session = await getConnectProSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

  // Validated here rather than at booking time — a broken link should be
  // rejected while the mentor is looking at the field, not discovered by a
  // mentee trying to join a call.
  let defaultMeetingUrl: string | null | undefined;
  if (typeof body.defaultMeetingUrl === "string") {
    const raw = body.defaultMeetingUrl.trim();
    if (raw === "") {
      defaultMeetingUrl = null;
    } else {
      try {
        defaultMeetingUrl = normaliseMeetingUrl(raw);
      } catch (error) {
        return NextResponse.json(
          { message: error instanceof Error ? error.message : "Invalid link" },
          { status: 400 },
        );
      }
    }
  }

  const status =
    body.status === "draft" || body.status === "active" || body.status === "paused"
      ? body.status
      : undefined;

  /**
   * Going live is the one transition that has to be earned.
   *
   * Checked here rather than only in the UI, because the UI is a suggestion:
   * this endpoint is reachable directly, and a mentor listed with no sessions
   * or no hours is a page that wastes a visitor's time. The same function
   * drives the checklist, so the button and the gate cannot disagree.
   */
  if (status === "active") {
    const [existing, sessionTypes, rules] = await Promise.all([
      dbGetMentor(session.userId),
      dbListSessionTypes(session.userId),
      dbListAvailabilityRules(session.userId),
    ]);

    const readiness = evaluateReadiness({
      headline: typeof body.headline === "string" ? body.headline : (existing?.headline ?? null),
      bio: typeof body.bio === "string" ? body.bio : (existing?.bio ?? null),
      expertise: existing?.expertise ?? [],
      activeSessionCount: sessionTypes.length,
      hasPaidSession: sessionTypes.some((type) => type.priceCents > 0),
      weeklyWindowCount: rules.length,
      defaultMeetingUrl: defaultMeetingUrl ?? existing?.defaultMeetingUrl ?? null,
      payoutsEnabled: existing?.payoutsEnabled ?? false,
      paymentsConfigured: paymentsConfigured(),
    });

    if (!readiness.canPublish) {
      return NextResponse.json(
        {
          message: `Not ready to publish yet: ${readiness.blocking
            .map((item) => item.label.toLowerCase())
            .join(", ")}.`,
          blocking: readiness.blocking,
        },
        { status: 400 },
      );
    }
  }

  try {
    const mentor = await dbUpsertMentor(session.userId, {
      defaultMeetingUrl,
      status,
      headline: typeof body.headline === "string" ? body.headline : undefined,
      bio: typeof body.bio === "string" ? body.bio : undefined,
      timezone: typeof body.timezone === "string" ? body.timezone : undefined,
      expertise: Array.isArray(body.expertise)
        ? // Trimmed, de-duplicated and capped: these become search facets, and
          // an unbounded list of near-identical tags makes discovery worse.
          Array.from(
            new Set(
              body.expertise
                .filter((tag): tag is string => typeof tag === "string")
                .map((tag) => tag.trim())
                .filter(Boolean),
            ),
          ).slice(0, 12)
        : undefined,
      // The mentor half of the matching pairs. Filtered against the same lists
      // a member picks from, so the two sides stay comparable.
      menteeTypes: body.menteeTypes === undefined ? undefined : keepKnown(body.menteeTypes, MENTEE_TYPES),
      helpOffered: body.helpOffered === undefined ? undefined : keepKnown(body.helpOffered, HELP_TYPES),
      industries: body.industries === undefined ? undefined : keepKnown(body.industries, INDUSTRIES),
      languages:
        body.languages === undefined
          ? undefined
          : keepTags(body.languages, 6).filter(
              (language) =>
                COMMON_LANGUAGES.includes(language as (typeof COMMON_LANGUAGES)[number]) ||
                language.length <= 30,
            ),
      onboardingStep:
        typeof body.onboardingStep === "number" && Number.isInteger(body.onboardingStep)
          ? Math.max(0, Math.min(body.onboardingStep, SETUP_STEPS.length))
          : undefined,
      minNoticeHours:
        typeof body.minNoticeHours === "number" ? body.minNoticeHours : undefined,
      bookingHorizonDays:
        typeof body.bookingHorizonDays === "number" ? body.bookingHorizonDays : undefined,
    });
    return NextResponse.json(mentor);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Could not save" },
      { status: 400 },
    );
  }
}
