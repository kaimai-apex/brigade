import { NextRequest, NextResponse } from "next/server";
import { dbGetMentorReviews } from "@/lib/server/mentorship-db";

/**
 * GET /api/mentorship/mentors/[id]/reviews
 *
 * Get all visible reviews for a mentor.
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

    const reviews = await dbGetMentorReviews(mentorUserId);

    return NextResponse.json({ reviews });
  } catch (error) {
    console.error("[GET /api/mentorship/mentors/:id/reviews]", error);
    return NextResponse.json(
      {
        message: "Failed to fetch reviews",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
