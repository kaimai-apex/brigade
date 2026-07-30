import { NextResponse } from "next/server";
import { getConnectProSession } from "@/lib/connectpro/server";
import { dbMarkNotificationRead } from "@/lib/server/notify-db";

/** Mark one notification read: POST /api/notifications/:id/read */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getConnectProSession();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  try {
    // Ownership is enforced in the UPDATE's WHERE clause, so a caller cannot
    // mark — or probe the existence of — someone else's notification.
    const notification = await dbMarkNotificationRead(id, session.userId);
    return NextResponse.json(notification ?? { id, read: true });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Could not update notification" },
      { status: 400 },
    );
  }
}
