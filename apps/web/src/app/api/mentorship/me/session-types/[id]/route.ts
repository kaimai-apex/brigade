import { NextResponse } from "next/server";
import { getConnectProSession } from "@/lib/connectpro/server";
import { dbDeactivateSessionType, dbUpdateSessionType } from "@/lib/server/mentorship-db";

/**
 * Change or retire one session.
 *
 * Ownership lives in each query's WHERE clause rather than in a check here, so
 * a guessed id cannot reprice somebody else's work.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getConnectProSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

  try {
    const updated = await dbUpdateSessionType(id, session.userId, {
      title: typeof body.title === "string" ? body.title : undefined,
      description:
        typeof body.description === "string"
          ? body.description
          : body.description === null
            ? null
            : undefined,
      durationMinutes:
        typeof body.durationMinutes === "number" ? body.durationMinutes : undefined,
      priceCents: typeof body.priceCents === "number" ? body.priceCents : undefined,
      active: typeof body.active === "boolean" ? body.active : undefined,
    });
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Could not update the session" },
      { status: 400 },
    );
  }
}

/** Retires the session. Past bookings still reference the row, so it is never deleted. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getConnectProSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await dbDeactivateSessionType(id, session.userId);
  return NextResponse.json({ ok: true });
}
