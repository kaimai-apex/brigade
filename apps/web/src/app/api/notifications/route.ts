import { NextResponse } from "next/server";
import { getConnectProSession } from "@/lib/connectpro/server";
import { dbListNotifications } from "@/lib/server/notify-db";

/**
 * List the caller's notifications, straight from Postgres.
 *
 * notification-service owns this in the microservice topology, but only apps/web
 * is deployed to the hosted site — so the gateway-proxied route this replaces
 * resolved to an unreachable localhost:3000 in production and every notification
 * silently came back empty.
 */
export async function GET(request: Request) {
  const session = await getConnectProSession();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const limit = Number(new URL(request.url).searchParams.get("limit") ?? 20);
  try {
    return NextResponse.json({
      data: await dbListNotifications(session.userId, Number.isFinite(limit) ? limit : 20),
    });
  } catch (error) {
    console.error("[notifications]", error instanceof Error ? error.message : error);
    // An empty list degrades the bell badge; a 500 breaks every page that
    // renders the app shell.
    return NextResponse.json({ data: [] });
  }
}
