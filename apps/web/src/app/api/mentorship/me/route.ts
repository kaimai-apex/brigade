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
import { paymentsConfigured } from "@/lib/server/payments";

/** The caller's own mentor setup, or null if they have not started one. */
export async function GET() {
  const session = await getConnectProSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const mentor = await dbGetMentor(session.userId);
    if (!mentor) {
      return NextResponse.json({ mentor: null, paymentsConfigured: paymentsConfigured() });
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
      paymentsConfigured: paymentsConfigured(),
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

  try {
    const mentor = await dbUpsertMentor(session.userId, {
      defaultMeetingUrl,
      headline: typeof body.headline === "string" ? body.headline : undefined,
      bio: typeof body.bio === "string" ? body.bio : undefined,
      timezone: typeof body.timezone === "string" ? body.timezone : undefined,
      status:
        body.status === "draft" || body.status === "active" || body.status === "paused"
          ? body.status
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
