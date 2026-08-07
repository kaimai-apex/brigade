import { NextResponse } from "next/server";
import { getConnectProSession } from "@/lib/connectpro/server";
import {
  dbCancelBooking,
  dbConfirmFreeBooking,
  dbCreateBooking,
  dbCreateCalendlyBooking,
  dbAttachCheckoutSession,
  dbGetBillingEmail,
  dbGetMentor,
  dbListBookingsForMentee,
  dbListBookingsForMentor,
  dbListSessionTypes,
  mentorScheduleUrl,
  mentorUsesCalendly,
  SlotUnavailableError,
  TooManyPendingBookingsError,
} from "@/lib/server/mentorship-db";
import { CHECKOUT_WINDOW_MINUTES } from "@/lib/mentorship/holds";
import { dbNotify } from "@/lib/server/notify-db";
import {
  createPlatformCheckoutSession,
  getPaymentProvider,
  paymentsFullyConfigured,
} from "@/lib/server/payments";
import { getSiteUrl } from "@/lib/site-url";
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

async function displayName(userId: string): Promise<string | undefined> {
  const who = await getPool().query(
    "SELECT first_name, last_name FROM users.profiles WHERE user_id = $1",
    [userId],
  );
  const row = who.rows[0];
  if (!row) return undefined;
  return `${row.first_name ?? ""} ${row.last_name ?? ""}`.trim() || undefined;
}

/**
 * Reserve a session and take payment.
 *
 * Calendly mentors: platform Checkout (no Connect), then mentee schedules on
 * Calendly. Native mentors keep slot + Connect destination charges when set up.
 */
export async function POST(request: Request) {
  const session = await getConnectProSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const { mentorUserId, sessionTypeId, startsAt } = body;

  if (typeof mentorUserId !== "string") {
    return NextResponse.json({ message: "mentorUserId is required" }, { status: 400 });
  }

  const mentor = await dbGetMentor(mentorUserId);
  if (!mentor || mentor.status !== "active") {
    return NextResponse.json({ message: "This mentor is not taking bookings" }, { status: 400 });
  }

  const usesCalendly = mentorUsesCalendly(mentor);
  const payments = getPaymentProvider();
  const takingPayments = paymentsFullyConfigured();

  // ---- Calendly path: pay on Brigade, schedule elsewhere. -----------------
  if (usesCalendly) {
    let booking;
    try {
      booking = await dbCreateCalendlyBooking(session.userId, {
        mentorUserId,
        sessionTypeId: typeof sessionTypeId === "string" ? sessionTypeId : undefined,
      });
    } catch (error) {
      if (error instanceof TooManyPendingBookingsError) {
        return NextResponse.json({ message: error.message }, { status: 429 });
      }
      if (error instanceof SlotUnavailableError) {
        return NextResponse.json(
          { message: "Could not hold that booking — please try again." },
          { status: 409 },
        );
      }
      return NextResponse.json(
        { message: error instanceof Error ? error.message : "Could not book" },
        { status: 400 },
      );
    }

    const sessionType = (await dbListSessionTypes(mentorUserId)).find(
      (type) => type.id === booking.sessionTypeId,
    );
    const actorName = await displayName(session.userId);

    if (booking.priceCents === 0) {
      const confirmed = (await dbConfirmFreeBooking(booking.id)) ?? booking;
      await dbNotify(mentorUserId, "mentorship_booking", {
        bookingId: confirmed.id,
        actorId: session.userId,
        actorName,
        startsAt: confirmed.startsAt,
      });
      return NextResponse.json(
        {
          ...confirmed,
          checkoutUrl: null,
          calendlyUrl: mentorScheduleUrl(mentor),
        },
        { status: 201 },
      );
    }

    if (takingPayments) {
      try {
        const receiptEmail = await dbGetBillingEmail(session.userId);
        const site = getSiteUrl();
        const checkout = await createPlatformCheckoutSession({
          currency: booking.currency,
          priceCents: booking.priceCents,
          description: sessionType?.title ?? "Mentorship session",
          kind: "mentorship_calendly",
          successUrl: `${site}/sessions/${booking.id}?paid=1`,
          cancelUrl: `${site}/mentors/${mentorUserId}?checkout=cancelled`,
          receiptEmail: receiptEmail ?? undefined,
          expiresAt: Math.floor(Date.now() / 1000) + CHECKOUT_WINDOW_MINUTES * 60,
          metadata: {
            brigade_booking_id: booking.id,
            mentor_user_id: mentorUserId,
            mentee_user_id: session.userId,
          },
        });

        await dbAttachCheckoutSession(booking.id, checkout.sessionId);

        return NextResponse.json(
          {
            ...booking,
            checkoutSessionId: checkout.sessionId,
            checkoutUrl: checkout.url,
          },
          { status: 201 },
        );
      } catch (error) {
        await dbCancelBooking(booking.id, session.userId).catch(() => null);
        console.error(
          "[mentorship/bookings calendly checkout]",
          error instanceof Error ? error.message : error,
        );
        return NextResponse.json(
          { message: "Could not start the payment. Nothing was charged — please try again." },
          { status: 502 },
        );
      }
    }

    await dbNotify(mentorUserId, "mentorship_booking", {
      bookingId: booking.id,
      actorId: session.userId,
      actorName,
      startsAt: booking.startsAt,
    });

    return NextResponse.json(
      {
        ...booking,
        checkoutUrl: null,
        calendlyUrl: mentorScheduleUrl(mentor),
        requiresManualConfirmation: true,
      },
      { status: 201 },
    );
  }

  // ---- Native slot path (legacy mentors without Calendly). ----------------
  if (typeof sessionTypeId !== "string" || typeof startsAt !== "string") {
    return NextResponse.json(
      { message: "sessionTypeId and startsAt are required" },
      { status: 400 },
    );
  }

  const start = new Date(startsAt);
  if (Number.isNaN(start.getTime())) {
    return NextResponse.json({ message: "startsAt is not a valid time" }, { status: 400 });
  }

  const sessionType = (await dbListSessionTypes(mentorUserId)).find(
    (type) => type.id === sessionTypeId,
  );
  if (!sessionType) {
    return NextResponse.json({ message: "That session is no longer offered" }, { status: 400 });
  }

  if (
    takingPayments &&
    sessionType.priceCents > 0 &&
    (!mentor.payoutAccountId || !mentor.payoutsEnabled)
  ) {
    return NextResponse.json(
      {
        message:
          "This mentor has not finished setting up payouts, so this session cannot be paid for yet.",
      },
      { status: 409 },
    );
  }

  let booking;
  try {
    booking = await dbCreateBooking(session.userId, {
      mentorUserId,
      sessionTypeId,
      startsAt: start,
    });
  } catch (error) {
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

  const actorName = await displayName(session.userId);

  if (booking.priceCents === 0) {
    const confirmed = (await dbConfirmFreeBooking(booking.id)) ?? booking;
    await dbNotify(mentorUserId, "mentorship_booking", {
      bookingId: confirmed.id,
      actorId: session.userId,
      actorName,
      startsAt: confirmed.startsAt,
    });
    return NextResponse.json({ ...confirmed, checkoutUrl: null }, { status: 201 });
  }

  if (takingPayments) {
    try {
      const receiptEmail = await dbGetBillingEmail(session.userId);
      const site = getSiteUrl();
      const checkout = await payments.createCheckoutSession({
        bookingId: booking.id,
        destinationAccountId: mentor.payoutAccountId!,
        currency: booking.currency,
        priceCents: booking.priceCents,
        description: sessionType.title,
        successUrl: `${site}/sessions/${booking.id}?paid=1`,
        cancelUrl: `${site}/mentors/${mentorUserId}?checkout=cancelled`,
        receiptEmail: receiptEmail ?? undefined,
        expiresAt: Math.floor(Date.now() / 1000) + CHECKOUT_WINDOW_MINUTES * 60,
      });

      await dbAttachCheckoutSession(booking.id, checkout.sessionId);

      return NextResponse.json(
        { ...booking, checkoutSessionId: checkout.sessionId, checkoutUrl: checkout.url },
        { status: 201 },
      );
    } catch (error) {
      await dbCancelBooking(booking.id, session.userId).catch(() => null);
      console.error(
        "[mentorship/bookings checkout]",
        error instanceof Error ? error.message : error,
      );
      return NextResponse.json(
        { message: "Could not start the payment. Nothing was charged — please try again." },
        { status: 502 },
      );
    }
  }

  await dbNotify(mentorUserId, "mentorship_booking", {
    bookingId: booking.id,
    actorId: session.userId,
    actorName,
    startsAt: booking.startsAt,
  });

  return NextResponse.json(
    { ...booking, checkoutUrl: null, requiresManualConfirmation: true },
    { status: 201 },
  );
}
