import { NextResponse } from "next/server";
import {
  dbGetMentor,
  dbListSessionTypes,
  dbGetSlots,
  toPublicMentor,
} from "@/lib/server/mentorship-db";

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
    // Only live mentors are public. Draft and paused stay out of the open API.
    if (!mentor || mentor.status !== "active") {
      return NextResponse.json({ message: "Mentor not found" }, { status: 404 });
    }

    const sessionTypes = await dbListSessionTypes(id);
    const requested = new URL(request.url).searchParams.get("sessionTypeId");
    const chosen = sessionTypes.find((t) => t.id === requested) ?? sessionTypes[0];

    const slots = chosen ? await dbGetSlots(id, chosen.id) : [];

    /**
     * Capped, and the caller is told when it was.
     *
     * A mentor with a 60-day horizon and two weekly windows already returns
     * over 400 slots; the column allows a horizon of 365, which is thousands.
     * Nobody scrolls that far — the booking panel shows the soonest few — so
     * the rest is payload nobody reads. `hasMore` exists so a future "show
     * later dates" control has something honest to key off, rather than the UI
     * quietly implying these are all the times available.
     */
    const MAX_SLOTS = 200;
    const visible = slots.slice(0, MAX_SLOTS);

    return NextResponse.json({
      mentor: toPublicMentor(mentor),
      sessionTypes,
      selectedSessionTypeId: chosen?.id ?? null,
      slots: visible.map((s) => ({
        startsAt: s.startsAt.toISOString(),
        endsAt: s.endsAt.toISOString(),
      })),
      hasMoreSlots: slots.length > visible.length,
    });
  } catch (error) {
    console.error("[mentorship/mentor]", error instanceof Error ? error.message : error);
    return NextResponse.json({ message: "Could not load mentor" }, { status: 500 });
  }
}
