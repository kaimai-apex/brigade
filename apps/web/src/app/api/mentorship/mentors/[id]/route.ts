import { NextResponse } from "next/server";
import { dbGetMentor, dbListSessionTypes, dbGetSlots } from "@/lib/server/mentorship-db";

/**
 * One mentor's public offering: GET /api/mentorship/mentors/:id[?sessionTypeId=]
 *
 * Slots are computed for a specific session type, since a 30-minute and a
 * 90-minute session divide the same availability window differently.
 * Browse + slot preview is public; booking still requires a session.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const mentor = await dbGetMentor(id);
    if (!mentor || mentor.status === "draft") {
      return NextResponse.json({ message: "Mentor not found" }, { status: 404 });
    }

    const sessionTypes = await dbListSessionTypes(id);
    const requested = new URL(request.url).searchParams.get("sessionTypeId");
    const chosen = sessionTypes.find((t) => t.id === requested) ?? sessionTypes[0];

    const slots = chosen ? await dbGetSlots(id, chosen.id) : [];

    return NextResponse.json({
      mentor,
      sessionTypes,
      selectedSessionTypeId: chosen?.id ?? null,
      slots: slots.map((s) => ({
        startsAt: s.startsAt.toISOString(),
        endsAt: s.endsAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("[mentorship/mentor]", error instanceof Error ? error.message : error);
    return NextResponse.json({ message: "Could not load mentor" }, { status: 500 });
  }
}
