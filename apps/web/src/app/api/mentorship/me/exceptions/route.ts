import { NextResponse } from "next/server";
import { getConnectProSession } from "@/lib/connectpro/server";
import { dbListExceptions, dbCreateException } from "@/lib/server/mentorship-db";

/** Time off: GET /api/mentorship/me/exceptions */
export async function GET() {
  const session = await getConnectProSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ data: await dbListExceptions(session.userId) });
}

/** Block a window. Dates arrive as ISO strings from the client's date inputs. */
export async function POST(request: Request) {
  const session = await getConnectProSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  if (typeof body.startsAt !== "string" || typeof body.endsAt !== "string") {
    return NextResponse.json({ message: "startsAt and endsAt are required" }, { status: 400 });
  }

  const startsAt = new Date(body.startsAt);
  const endsAt = new Date(body.endsAt);
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    return NextResponse.json({ message: "Those dates are not valid" }, { status: 400 });
  }

  try {
    return NextResponse.json(
      await dbCreateException(session.userId, {
        startsAt,
        endsAt,
        reason: typeof body.reason === "string" ? body.reason : undefined,
      }),
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Could not save time off" },
      { status: 400 },
    );
  }
}
