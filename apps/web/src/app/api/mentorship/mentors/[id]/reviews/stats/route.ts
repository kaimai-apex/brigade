import { NextRequest, NextResponse } from "next/server";
import { dbGetMentorReviewStats } from "@/lib/server/mentorship-db";

/**
 * GET /api/mentorship/mentors/[id]/reviews/stats
 *
 * Get review statistics for a mentor.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: mentorUserId } = await params;

    if (!mentorUserId) {
      return NextResponse.json(
        { message: "Mentor ID is required" },
        { status: 400 }
      );
    }

    const stats = await dbGetMentorReviewStats(mentorUserId);

    if (!stats) {
      return NextResponse.json({
        stats: {
          reviewCount: 0,
          avgRating: 0,
          fiveStarCount: 0,
          fourStarCount: 0,
          threeStarCount: 0,
          twoStarCount: 0,
          oneStarCount: 0,
        },
      });
    }

    return NextResponse.json({ stats });
  } catch (error) {
    console.error("[GET /api/mentorship/mentors/:id/reviews/stats]", error);
    return NextResponse.json(
      {
        message: "Failed to fetch review stats",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
