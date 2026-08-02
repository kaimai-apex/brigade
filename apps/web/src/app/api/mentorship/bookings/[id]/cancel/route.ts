import { NextResponse } from "next/server";
import { getConnectProSession } from "@/lib/connectpro/server";
import { dbCancelBooking } from "@/lib/server/mentorship-db";
import { dbNotify } from "@/lib/server/notify-db";
import { getPaymentProvider } from "@/lib/server/payments";

/**
 * Cancel: POST /api/mentorship/bookings/:id/cancel
 *
 * Either party may cancel. Ownership is enforced in the UPDATE's WHERE clause,
 * so this cannot be used to cancel a stranger's session. If a Stripe
 * PaymentIntent was attached, it is voided best-effort so the hold does not
 * stay open after the calendar slot is released.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getConnectProSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const booking = await dbCancelBooking(id, session.userId);

    if (booking.paymentIntentId) {
      await getPaymentProvider().cancelPaymentIntent(booking.paymentIntentId);
    }

    // Tell whichever side did not press the button.
    const other =
      booking.mentorUserId === session.userId ? booking.menteeUserId : booking.mentorUserId;
    await dbNotify(other, "mentorship_cancelled", {
      bookingId: booking.id,
      actorId: session.userId,
      startsAt: booking.startsAt,
    });
    return NextResponse.json(booking);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Could not cancel" },
      { status: 400 },
    );
  }
}
