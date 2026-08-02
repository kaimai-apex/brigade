import { NextResponse } from "next/server";
import { getConnectProSession } from "@/lib/connectpro/server";
import {
  dbCreateBooking,
  dbListBookingsForMentee,
  dbListBookingsForMentor,
  SlotUnavailableError,
  TooManyPendingBookingsError,
} from "@/lib/server/mentorship-db";
import { dbNotify } from "@/lib/server/notify-db";
import { getPool } from "@connectpro/common";

/** Both sides of the caller's calendar. */
export async function GET() {
  const session = await getConnectProSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const [booked, teaching] = await Promise.all([
      dbListBookingsForMentee(session.userId),
      dbListBookingsForMentor(session.userId),
    ]);
    return NextResponse.json({ booked, teaching });
  } catch (error) {
    console.error("[mentorship/bookings]", error instanceof Error ? error.message : error);
    return NextResponse.json({ booked: [], teaching: [] });
  }
}

/**
 * Reserve a slot.
 *
 * The booking is created `pending_payment`. It only becomes `confirmed` once a
 * real charge settles, so an unpaid hold never shows up as a promise to either
 * party.
 */
export async function POST(request: Request) {
  const session = await getConnectProSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const { mentorUserId, sessionTypeId, startsAt } = body;

  if (typeof mentorUserId !== "string" || typeof sessionTypeId !== "string" || typeof startsAt !== "string") {
    return NextResponse.json(
      { message: "mentorUserId, sessionTypeId and startsAt are required" },
      { status: 400 },
    );
  }

  const start = new Date(startsAt);
  if (Number.isNaN(start.getTime())) {
    return NextResponse.json({ message: "startsAt is not a valid time" }, { status: 400 });
  }

  try {
    const booking = await dbCreateBooking(session.userId, {
      mentorUserId,
      sessionTypeId,
      startsAt: start,
    });

    // Tell the mentor. Best-effort by design — dbNotify swallows its own
    // failures, because a notification must not undo a confirmed reservation.
    const who = await getPool().query(
      "SELECT first_name, last_name FROM users.profiles WHERE user_id = $1",
      [session.userId],
    );
    const p = who.rows[0];
    await dbNotify(mentorUserId, "mentorship_booking", {
      bookingId: booking.id,
      actorId: session.userId,
      actorName: p ? `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() : undefined,
      startsAt: booking.startsAt,
    });

    return NextResponse.json(booking, { status: 201 });
  } catch (error) {
    // Losing the race is an ordinary outcome, not a server fault.
    if (error instanceof SlotUnavailableError) {
      return NextResponse.json({ message: error.message }, { status: 409 });
    }
    if (error instanceof TooManyPendingBookingsError) {
      return NextResponse.json({ message: error.message }, { status: 429 });
    }
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Could not book" },
      { status: 400 },
    );
  }
}
