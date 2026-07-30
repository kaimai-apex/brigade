import { NextResponse } from "next/server";
import { getConnectProSession } from "@/lib/connectpro/server";
import { dbConfirmBooking } from "@/lib/server/mentorship-db";
import { dbNotify } from "@/lib/server/notify-db";
import { paymentsConfigured } from "@/lib/server/payments";

/**
 * The mentor accepts a booking: POST /api/mentorship/bookings/:id/confirm
 *
 * Only available while payments are switched off. Once Stripe is configured a
 * settled charge is what confirms a session, and leaving this open would be a
 * button that hands out paid sessions for nothing — so it is refused rather
 * than quietly kept as an override.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getConnectProSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  if (paymentsConfigured()) {
    return NextResponse.json(
      {
        message:
          "Payments are switched on, so a session is confirmed when the payment settles — not by hand.",
      },
      { status: 409 },
    );
  }

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { meetingUrl?: unknown };

  try {
    const booking = await dbConfirmBooking(
      id,
      session.userId,
      typeof body.meetingUrl === "string" ? body.meetingUrl : undefined,
    );

    await dbNotify(booking.menteeUserId, "mentorship_confirmed", {
      bookingId: booking.id,
      actorId: session.userId,
      startsAt: booking.startsAt,
    });

    return NextResponse.json(booking);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Could not confirm" },
      { status: 400 },
    );
  }
}
