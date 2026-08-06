import { NextResponse } from "next/server";
import { getConnectProSession } from "@/lib/connectpro/server";
import { dbGetSessionTypeById } from "@/lib/server/mentorship-db";
import { POST as createBooking } from "@/app/api/mentorship/bookings/route";

/**
 * Prompt-shaped checkout entry.
 *
 * Accepts `{ sessionTypeId, startsAt }` (and optional `mentorUserId`) and
 * forwards to the canonical booking create path, which holds the slot and
 * returns a Stripe Checkout URL when payments are live.
 *
 * Canonical implementation: POST /api/mentorship/bookings
 */
export async function POST(request: Request) {
  const session = await getConnectProSession();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const sessionTypeId =
    typeof body.sessionTypeId === "string" ? body.sessionTypeId : null;
  const startsAt = typeof body.startsAt === "string" ? body.startsAt : null;
  let mentorUserId =
    typeof body.mentorUserId === "string" ? body.mentorUserId : null;

  if (!sessionTypeId || !startsAt) {
    return NextResponse.json(
      { message: "sessionTypeId and startsAt are required" },
      { status: 400 },
    );
  }

  if (!mentorUserId) {
    const sessionType = await dbGetSessionTypeById(sessionTypeId);
    if (!sessionType) {
      return NextResponse.json(
        { message: "That session is no longer offered" },
        { status: 400 },
      );
    }
    mentorUserId = sessionType.mentorUserId;
  }

  // cookies() inside createBooking still resolves from this request's context.
  const forward = new Request(request.url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mentorUserId, sessionTypeId, startsAt }),
  });

  return createBooking(forward);
}
