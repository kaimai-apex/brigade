import { NextResponse } from "next/server";
import { getConnectProSession } from "@/lib/connectpro/server";
import {
  dbGetMentor,
  dbUpsertMentor,
  dbListSessionTypes,
  dbListAvailabilityRules,
  dbListExceptions,
  dbEnsureDefaultSessionType,
  normaliseMeetingUrl,
} from "@/lib/server/mentorship-db";
import { paymentsConfigured, paymentsFullyConfigured } from "@/lib/server/payments";
import { evaluateReadiness } from "@/lib/mentorship/readiness";
import { getPool } from "@connectpro/common";

function readinessFrom(
  mentor: {
    headline: string | null;
    bio: string | null;
    expertise: string[];
    helpOffered: string[];
    calendlyUrl: string | null;
    defaultMeetingUrl: string | null;
  } | null,
  profile: {
    firstName: string | null;
    lastName: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
  },
  overrides?: {
    headline?: string | null;
    bio?: string | null;
    expertise?: string[];
    helpOffered?: string[];
    calendlyUrl?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    city?: string | null;
    state?: string | null;
    country?: string | null;
  },
) {
  const firstName = overrides?.firstName ?? profile.firstName;
  const lastName = overrides?.lastName ?? profile.lastName;
  const city = overrides?.city ?? profile.city;
  const state = overrides?.state ?? profile.state;
  const country = overrides?.country ?? profile.country;
  const name = [firstName, lastName].filter(Boolean).join(" ").trim() || null;
  const location = [city, state, country].filter(Boolean).join(", ").trim() || null;
  const expertise = overrides?.expertise ?? mentor?.expertise ?? [];
  const helpOffered = overrides?.helpOffered ?? mentor?.helpOffered ?? [];
  const mentorshipOffered =
    helpOffered[0]?.trim() ||
    expertise.join(", ").trim() ||
    null;
  const calendlyUrl =
    overrides?.calendlyUrl ?? mentor?.calendlyUrl ?? mentor?.defaultMeetingUrl ?? null;

  return evaluateReadiness({
    name,
    headline: overrides?.headline ?? mentor?.headline ?? null,
    location,
    bio: overrides?.bio ?? mentor?.bio ?? null,
    mentorshipOffered,
    calendlyUrl,
  });
}

async function loadProfile(userId: string) {
  const profileRes = await getPool().query(
    `SELECT first_name, last_name, avatar_url, role, city, state, country,
            current_employer, years_experience
       FROM users.profiles WHERE user_id = $1`,
    [userId],
  );
  const p = profileRes.rows[0] ?? {};
  return {
    firstName: (p.first_name as string) ?? null,
    lastName: (p.last_name as string) ?? null,
    avatarUrl: (p.avatar_url as string) ?? null,
    role: (p.role as string) ?? null,
    city: (p.city as string) ?? null,
    state: (p.state as string) ?? null,
    country: (p.country as string) ?? null,
    currentEmployer: (p.current_employer as string) ?? null,
    yearsExperience:
      p.years_experience === null || p.years_experience === undefined
        ? null
        : Number(p.years_experience),
  };
}

/** The caller's own mentor setup, or null if they have not started one. */
export async function GET() {
  const session = await getConnectProSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const mentor = await dbGetMentor(session.userId);
    const profile = await loadProfile(session.userId);

    if (!mentor) {
      return NextResponse.json({
        mentor: null,
        profile,
        paymentsConfigured: paymentsConfigured(),
        takingPayments: paymentsFullyConfigured(),
      });
    }

    const [sessionTypes, availability, exceptions] = await Promise.all([
      dbListSessionTypes(session.userId, { activeOnly: false }),
      dbListAvailabilityRules(session.userId),
      dbListExceptions(session.userId),
    ]);

    return NextResponse.json({
      mentor,
      sessionTypes,
      availability,
      exceptions,
      readiness: readinessFrom(mentor, profile),
      profile,
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

  let calendlyUrl: string | null | undefined;
  const calendlyRaw =
    typeof body.calendlyUrl === "string"
      ? body.calendlyUrl
      : typeof body.defaultMeetingUrl === "string"
        ? body.defaultMeetingUrl
        : undefined;
  if (typeof calendlyRaw === "string") {
    const raw = calendlyRaw.trim();
    if (raw === "") {
      calendlyUrl = null;
    } else {
      try {
        calendlyUrl = normaliseMeetingUrl(raw);
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

  const firstName =
    typeof body.firstName === "string" ? body.firstName.trim().slice(0, 80) : undefined;
  const lastName =
    typeof body.lastName === "string" ? body.lastName.trim().slice(0, 80) : undefined;
  const city = typeof body.city === "string" ? body.city.trim().slice(0, 80) : undefined;
  const state = typeof body.state === "string" ? body.state.trim().slice(0, 80) : undefined;
  const country =
    typeof body.country === "string" ? body.country.trim().slice(0, 80) : undefined;

  const mentorshipOffered =
    typeof body.mentorshipOffered === "string"
      ? body.mentorshipOffered.trim().slice(0, 2000)
      : undefined;

  // Profile fields (name / place) live on users.profiles — update when provided.
  if (
    firstName !== undefined ||
    lastName !== undefined ||
    city !== undefined ||
    state !== undefined ||
    country !== undefined
  ) {
    await getPool().query(
      `UPDATE users.profiles SET
         first_name = COALESCE($2, first_name),
         last_name  = COALESCE($3, last_name),
         city       = COALESCE($4, city),
         state      = COALESCE($5, state),
         country    = COALESCE($6, country),
         updated_at = now()
       WHERE user_id = $1`,
      [
        session.userId,
        firstName === undefined ? null : firstName || null,
        lastName === undefined ? null : lastName || null,
        city === undefined ? null : city || null,
        state === undefined ? null : state || null,
        country === undefined ? null : country || null,
      ],
    );
  }

  const profile = await loadProfile(session.userId);
  const existing = await dbGetMentor(session.userId);

  const expertise =
    mentorshipOffered !== undefined
      ? mentorshipOffered
        ? mentorshipOffered
            .split(/[\n,]+/)
            .map((tag) => tag.trim())
            .filter(Boolean)
            .slice(0, 12)
        : []
      : Array.isArray(body.expertise)
        ? Array.from(
            new Set(
              body.expertise
                .filter((tag): tag is string => typeof tag === "string")
                .map((tag) => tag.trim())
                .filter(Boolean),
            ),
          ).slice(0, 12)
        : undefined;

  const helpOffered =
    mentorshipOffered !== undefined
      ? mentorshipOffered
        ? [mentorshipOffered]
        : []
      : undefined;

  if (status === "active") {
    const readiness = readinessFrom(existing, profile, {
      headline: typeof body.headline === "string" ? body.headline : undefined,
      bio: typeof body.bio === "string" ? body.bio : undefined,
      expertise,
      helpOffered,
      calendlyUrl,
      firstName: firstName ?? undefined,
      lastName: lastName ?? undefined,
      city: city ?? undefined,
      state: state ?? undefined,
      country: country ?? undefined,
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
    // Mentor row must exist before we can attach a default session type.
    if (status === "active" && !existing) {
      await dbUpsertMentor(session.userId, {
        status: "draft",
        timezone:
          typeof body.timezone === "string"
            ? body.timezone
            : "UTC",
      });
    }

    if (status === "active") {
      await dbEnsureDefaultSessionType(session.userId);
    }

    const mentor = await dbUpsertMentor(session.userId, {
      calendlyUrl,
      defaultMeetingUrl: calendlyUrl,
      status,
      headline: typeof body.headline === "string" ? body.headline : undefined,
      bio: typeof body.bio === "string" ? body.bio : undefined,
      timezone: typeof body.timezone === "string" ? body.timezone : undefined,
      expertise,
      helpOffered,
      onboardingStep:
        typeof body.onboardingStep === "number" && Number.isInteger(body.onboardingStep)
          ? Math.max(0, Math.min(body.onboardingStep, 1))
          : status === "active"
            ? 1
            : undefined,
    });

    return NextResponse.json(mentor);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Could not save" },
      { status: 400 },
    );
  }
}
