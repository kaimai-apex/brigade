import { NextResponse } from "next/server";
import { getConnectProSession } from "@/lib/connectpro/server";
import { dbCancelBooking, dbGetBooking, dbRecordRefund } from "@/lib/server/mentorship-db";
import { dbNotify } from "@/lib/server/notify-db";
import { getPaymentProvider, paymentsConfigured } from "@/lib/server/payments";
import { refundForCancellation } from "@/lib/mentorship/pricing";

/**
 * Cancel: POST /api/mentorship/bookings/:id/cancel
 *
 * Either party may cancel. Ownership is enforced in the UPDATE's WHERE clause,
 * so this cannot be used to cancel a stranger's session.
 *
 * The order here is deliberate. The booking is read BEFORE it is cancelled, so
 * the refund is decided against the real status and the real amount already
 * returned; then the slot is released; then the money moves. Releasing the slot
 * first means a mentor gets their hour back even if Stripe is having a bad day,
 * and the refund is recorded separately so a failure there is visible rather
 * than silently rolling back a cancellation both people have already been told
 * about.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getConnectProSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const before = await dbGetBooking(id);
  if (
    !before ||
    (before.mentorUserId !== session.userId && before.menteeUserId !== session.userId)
  ) {
    return NextResponse.json({ message: "Booking not found" }, { status: 404 });
  }

  const cancelledByMentor = before.mentorUserId === session.userId;
  // Only a settled payment can be refunded. An unpaid hold is voided instead.
  const wasPaid = before.status === "confirmed" && before.paidAt !== null;

  const decision = refundForCancellation({
    priceCents: before.priceCents,
    refundedCents: before.refundedCents,
    startsAt: new Date(before.startsAt),
    now: new Date(),
    cancelledBy: cancelledByMentor ? "mentor" : "mentee",
  });

  let booking;
  try {
    booking = await dbCancelBooking(id, session.userId);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Could not cancel" },
      { status: 400 },
    );
  }

  let refundedCents = 0;
  if (wasPaid && decision.refundCents > 0 && booking.paymentIntentId && paymentsConfigured()) {
    try {
      const refund = await getPaymentProvider().refundCharge({
        paymentIntentId: booking.paymentIntentId,
        amountCents: decision.refundCents,
        reason: "requested_by_customer",
      });
      await dbRecordRefund(booking.id, refund.refundId, refund.amountCents);
      refundedCents = refund.amountCents;
    } catch (error) {
      // The session IS cancelled — saying otherwise would be worse. Surfaced
      // loudly so a stuck refund is chased rather than lost; the mentee is told
      // it is coming rather than shown a number that never arrives.
      console.error(
        `[mentorship/cancel] refund failed for booking ${booking.id}:`,
        error instanceof Error ? error.message : error,
      );
      const other = cancelledByMentor ? booking.menteeUserId : booking.mentorUserId;
      await dbNotify(other, "mentorship_cancelled", {
        bookingId: booking.id,
        actorId: session.userId,
        startsAt: booking.startsAt,
      });
      return NextResponse.json({
        ...booking,
        refundedCents: 0,
        refundPending: true,
        message:
          "The session is cancelled, but the refund did not go through. We are on it — it will be processed shortly.",
      });
    }
  } else if (booking.paymentIntentId && !wasPaid) {
    // Nothing settled: void the hold rather than refunding it.
    await getPaymentProvider().cancelPaymentIntent(booking.paymentIntentId);
  }

  const other = cancelledByMentor ? booking.menteeUserId : booking.mentorUserId;
  await dbNotify(other, "mentorship_cancelled", {
    bookingId: booking.id,
    actorId: session.userId,
    startsAt: booking.startsAt,
    refundedCents,
  });

  return NextResponse.json({
    ...booking,
    refundedCents,
    refundReason: decision.reason,
  });
}
