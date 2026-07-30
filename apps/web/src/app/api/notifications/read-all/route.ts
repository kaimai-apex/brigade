import { NextResponse } from "next/server";
import { getConnectProSession } from "@/lib/connectpro/server";
import { dbMarkAllNotificationsRead } from "@/lib/server/notify-db";

/**
 * Mark every unread notification read: POST /api/notifications/read-all
 *
 * One statement instead of the page's previous fan-out of one request per
 * unread row, which grew unbounded with the backlog it was clearing.
 */
export async function POST() {
  const session = await getConnectProSession();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    return NextResponse.json(await dbMarkAllNotificationsRead(session.userId));
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Could not update notifications" },
      { status: 400 },
    );
  }
}
