import { NextResponse } from "next/server";
import { getConnectProSession } from "@/lib/connectpro/server";
import { dbGetBookingDetail } from "@/lib/server/mentorship-db";

/**
 * One booking, for one of its two participants.
 *
 * Used by the receipt page to poll for the webhook landing. A missing booking
 * and someone else's booking both return 404: telling a stranger that an id
 * exists but is not theirs is still telling them something.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getConnectProSession();
  if (!session) return NextResponse.json({ message: "Not found" }, { status: 404 });

  const { id } = await params;
  const booking = await dbGetBookingDetail(id, session.userId);
  if (!booking) return NextResponse.json({ message: "Not found" }, { status: 404 });

  return NextResponse.json(booking, {
    headers: { "Cache-Control": "no-store" },
  });
}
