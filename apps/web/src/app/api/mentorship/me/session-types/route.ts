import { NextResponse } from "next/server";
import { getConnectProSession } from "@/lib/connectpro/server";
import { dbCreateSessionType, dbListSessionTypes } from "@/lib/server/mentorship-db";

export async function GET() {
  const session = await getConnectProSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  return NextResponse.json({
    data: await dbListSessionTypes(session.userId, { activeOnly: false }),
  });
}

/** Add something to sell. Price arrives in cents; the UI never sends a float. */
export async function POST(request: Request) {
  const session = await getConnectProSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  if (typeof body.title !== "string" || typeof body.durationMinutes !== "number") {
    return NextResponse.json({ message: "title and durationMinutes are required" }, { status: 400 });
  }
  if (typeof body.priceCents !== "number") {
    return NextResponse.json({ message: "priceCents is required" }, { status: 400 });
  }

  try {
    return NextResponse.json(
      await dbCreateSessionType(session.userId, {
        title: body.title,
        description: typeof body.description === "string" ? body.description : undefined,
        durationMinutes: body.durationMinutes,
        priceCents: body.priceCents,
      }),
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Could not create session" },
      { status: 400 },
    );
  }
}
