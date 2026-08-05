import { getConnectProSession } from "@/lib/connectpro/server";
import { dbGetBookingDetail } from "@/lib/server/mentorship-db";
import { buildIcs } from "@/lib/mentorship/calendar";

/** The session as a calendar file, for whichever of the two people asks. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getConnectProSession();
  if (!session) return new Response("Not found", { status: 404 });

  const { id } = await params;
  const booking = await dbGetBookingDetail(id, session.userId);
  if (!booking) return new Response("Not found", { status: 404 });

  const isMentor = booking.mentorUserId === session.userId;
  const other = isMentor ? booking.menteeName : booking.mentorName;

  const description = [
    isMentor
      ? `Mentorship session with ${other}.`
      : `Mentorship session with ${other} on Brigade.`,
    booking.sessionDescription ?? "",
    booking.meetingUrl ? `Join: ${booking.meetingUrl}` : "",
    booking.confirmationCode ? `Confirmation: ${booking.confirmationCode}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const ics = buildIcs({
    bookingId: booking.id,
    title: `${booking.sessionTitle} · ${other}`,
    description,
    startsAt: new Date(booking.startsAt),
    endsAt: new Date(booking.endsAt),
    location: booking.meetingUrl,
    cancelled: booking.status === "cancelled",
    organiserName: booking.mentorName,
  });

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="brigade-session-${booking.confirmationCode ?? booking.id}.ics"`,
      // A calendar file describes one specific booking that can be cancelled or
      // rescheduled; a cached copy would keep re-adding a stale entry.
      "Cache-Control": "no-store",
    },
  });
}
