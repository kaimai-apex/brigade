import Link from "next/link";
import { notFound } from "next/navigation";
import { AppPage } from "@/components/layout/app-shell";
import { getConnectProSession } from "@/lib/connectpro/server";
import { dbGetBookingDetail } from "@/lib/server/mentorship-db";
import { formatMoney, FREE_CANCELLATION_HOURS } from "@/lib/mentorship/pricing";
import {
  AwaitingConfirmation,
  CancelSessionButton,
  CopyLinkButton,
} from "@/components/mentorship/receipt-actions";
import { isUuid } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * The receipt for one session.
 *
 * Written from the reader's point of view: the mentee sees what they paid, the
 * mentor sees what they will receive. Both see the same session, the same
 * confirmation code and the same meeting link, because disagreeing about any of
 * those is how somebody ends up alone on a call.
 */
export default async function SessionReceiptPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ paid?: string }>;
}) {
  const session = await getConnectProSession();
  if (!session) notFound();

  const { id } = await params;
  if (!isUuid(id)) notFound();
  const { paid } = await searchParams;

  const booking = await dbGetBookingDetail(id, session.userId);
  if (!booking) notFound();

  const isMentor = booking.mentorUserId === session.userId;
  const otherName = isMentor ? booking.menteeName : booking.mentorName;

  const start = new Date(booking.startsAt);
  const end = new Date(booking.endsAt);

  const when = new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(start);

  // Only worth saying when it is different. Both people are usually in the same
  // zone, and "9:00 AM for Rita · 9:00 AM for you" is noise that makes the one
  // case that matters — a mentor three timezones away — easier to miss.
  const localTimeFormat = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  const mentorLocalTime = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    timeZone: booking.mentorTimezone,
  }).format(start);
  const zonesDiffer = mentorLocalTime !== localTimeFormat.format(start);

  const confirmed = booking.status === "confirmed";
  const cancelled = booking.status === "cancelled";
  const awaitingWebhook = booking.status === "pending_payment" && paid === "1";
  const refunded = booking.refundedCents > 0;

  return (
    <AppPage>
      <div className="mx-auto max-w-2xl">
        <nav className="text-[14px] text-[var(--mk-muted)]">
          <Link href="/sessions" className="hover:text-[var(--mk-text)]">
            Your sessions
          </Link>
          <span className="mx-2 text-[var(--mk-subtle)]">/</span>
          <span className="text-[var(--mk-text)]">Receipt</span>
        </nav>

        <header className="mt-5">
          <p className="text-[13px] font-semibold uppercase tracking-wide text-[var(--mk-subtle)]">
            {cancelled
              ? "Cancelled"
              : confirmed
                ? "Confirmed"
                : awaitingWebhook
                  ? "Payment received"
                  : "Not yet confirmed"}
          </p>
          <h1 className="mk-title mt-1">{booking.sessionTitle}</h1>
          <p className="mt-1 text-[15px] text-[var(--mk-muted)]">
            {isMentor ? `You are teaching ${otherName}` : `With ${otherName}`} ·{" "}
            {booking.durationMinutes} minutes
          </p>
        </header>

        {awaitingWebhook && (
          <div className="mt-6">
            <AwaitingConfirmation bookingId={booking.id} />
          </div>
        )}

        {cancelled && (
          <p className="mt-6 rounded-xl border border-[var(--mk-line)] bg-[var(--mk-wash)] p-4 text-[14px] text-[var(--mk-muted)]">
            This session was cancelled.
            {refunded
              ? ` ${formatMoney(booking.refundedCents, booking.currency)} was refunded.`
              : booking.priceCents > 0
                ? " No refund was issued."
                : ""}
          </p>
        )}

        {/* -------------------------------------------------------------- */}
        <section className="mk-card mt-6 p-6">
          <dl className="space-y-4">
            <Row label="When">
              {booking.meetingUrl?.includes("calendly.com") ? (
                <>
                  <span className="text-[var(--mk-text)]">
                    Pick a time on Calendly
                  </span>
                  <span className="mt-0.5 block text-[13px] text-[var(--mk-subtle)]">
                    Brigade holds a placeholder time until you schedule: {when}
                  </span>
                </>
              ) : (
                <>
                  <span className="text-[var(--mk-text)]">{when}</span>
                  {!isMentor && zonesDiffer && (
                    <span className="mt-0.5 block text-[13px] text-[var(--mk-subtle)]">
                      {mentorLocalTime} for {otherName} ·{" "}
                      {booking.mentorTimezone.replace(/_/g, " ")}
                    </span>
                  )}
                </>
              )}
            </Row>

            {booking.confirmationCode && (
              <Row label="Confirmation">
                <span className="font-mono text-[var(--mk-text)]">
                  {booking.confirmationCode}
                </span>
              </Row>
            )}

            {booking.sessionDescription && (
              <Row label="What this covers">
                <span className="text-[var(--mk-text)]">{booking.sessionDescription}</span>
              </Row>
            )}

            <Row label={isMentor ? "You receive" : "You paid"}>
              {booking.priceCents === 0 ? (
                <span className="text-[var(--mk-text)]">Free</span>
              ) : (
                <>
                  <span className="text-[17px] font-semibold text-[var(--mk-text)]">
                    {formatMoney(
                      isMentor ? booking.mentorPayoutCents : booking.priceCents,
                      booking.currency,
                    )}
                  </span>
                  {isMentor && (
                    <span className="mt-0.5 block text-[13px] text-[var(--mk-subtle)]">
                      {formatMoney(booking.priceCents, booking.currency)} paid, less{" "}
                      {formatMoney(booking.platformFeeCents, booking.currency)} Brigade fee
                    </span>
                  )}
                  {refunded && (
                    <span className="mt-0.5 block text-[13px] text-[var(--mk-subtle)]">
                      {formatMoney(booking.refundedCents, booking.currency)} refunded
                    </span>
                  )}
                </>
              )}
            </Row>

            {confirmed && (
              <Row
                label={
                  booking.meetingUrl?.includes("calendly.com")
                    ? "Schedule"
                    : "Where"
                }
              >
                {booking.meetingUrl ? (
                  <>
                    <a
                      href={booking.meetingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="break-all text-[var(--mk-text)] underline underline-offset-4"
                    >
                      {booking.meetingUrl}
                    </a>
                    <span className="mt-1 block">
                      <CopyLinkButton url={booking.meetingUrl} />
                    </span>
                    {booking.meetingUrl.includes("calendly.com") && (
                      <span className="mt-1 block text-[13px] text-[var(--mk-subtle)]">
                        {isMentor
                          ? "Your mentee uses this link to book a time with you."
                          : "Open Calendly to choose a time for the session."}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-[var(--mk-muted)]">
                    {isMentor
                      ? "You have not added a meeting room yet — add one on your mentoring page and send it to them."
                      : `${otherName} has not added a meeting link yet. They will send one before the session.`}
                  </span>
                )}
              </Row>
            )}
          </dl>

          {confirmed && (
            <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-[var(--mk-line)] pt-5">
              {booking.meetingUrl && (
                <a
                  href={booking.meetingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mk-btn mk-btn-dark"
                >
                  Join the call
                </a>
              )}
              <a href={`/api/mentorship/bookings/${booking.id}/ics`} className="mk-btn">
                Add to calendar
              </a>
              {booking.paymentIntentId && !isMentor && (
                <a
                  href={`https://dashboard.stripe.com/receipts/payment/${booking.paymentIntentId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[14px] text-[var(--mk-muted)] underline underline-offset-4 hover:text-[var(--mk-text)]"
                >
                  Payment receipt
                </a>
              )}
            </div>
          )}
        </section>

        {/* -------------------------------------------------------------- */}
        {!cancelled && (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-[13px] text-[var(--mk-subtle)]">
              {booking.priceCents === 0
                ? "Free session — cancel any time."
                : isMentor
                  ? "If you cancel, the session is refunded in full."
                  : `Free cancellation up to ${FREE_CANCELLATION_HOURS} hours before the session.`}
            </p>
            <CancelSessionButton
              bookingId={booking.id}
              priceCents={booking.priceCents}
              refundedCents={booking.refundedCents}
              currency={booking.currency}
              startsAt={booking.startsAt}
              viewerIsMentor={isMentor}
            />
          </div>
        )}

        {end.getTime() < Date.now() && confirmed && (
          <p className="mt-6 text-[14px] text-[var(--mk-muted)]">This session has finished.</p>
        )}
      </div>
    </AppPage>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[160px_1fr] sm:gap-4">
      <dt className="text-[13px] font-semibold uppercase tracking-wide text-[var(--mk-subtle)]">
        {label}
      </dt>
      <dd className="text-[15px]">{children}</dd>
    </div>
  );
}
