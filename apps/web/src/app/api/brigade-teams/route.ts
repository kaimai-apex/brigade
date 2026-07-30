import { NextResponse } from "next/server";
import { getConnectProSession } from "@/lib/connectpro/server";
import { dbListTeams, dbCreateTeam } from "@/lib/server/brigade-teams-db";

/** The caller's saved Brigades. */
export async function GET() {
  const session = await getConnectProSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    return NextResponse.json({ data: await dbListTeams(session.userId) });
  } catch (error) {
    console.error("[brigade-teams]", error instanceof Error ? error.message : error);
    return NextResponse.json({ data: [] });
  }
}

export async function POST(request: Request) {
  const session = await getConnectProSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  if (typeof body.name !== "string") {
    return NextResponse.json({ message: "name is required" }, { status: 400 });
  }
  const memberIds = Array.isArray(body.memberIds)
    ? body.memberIds.filter((m): m is string => typeof m === "string")
    : [];

  try {
    return NextResponse.json(await dbCreateTeam(session.userId, body.name, memberIds), {
      status: 201,
    });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Could not create" },
      { status: 400 },
    );
  }
}
