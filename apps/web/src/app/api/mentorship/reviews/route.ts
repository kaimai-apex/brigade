import { NextRequest, NextResponse } from "next/server";
import { getConnectProSession } from "@/lib/connectpro/server";
import { dbCreateReview, dbCanReviewBooking } from "@/lib/server/mentorship-db";

/**
 * POST /api/mentorship/reviews
 *
 * Submit a review for a completed mentorship session.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getConnectProSession();
    if (!session?.userId) {
      return NextResponse.json(
        { message: "You must be signed in to submit a review" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { bookingId, rating, comment } = body;

    if (!bookingId) {
      return NextResponse.json(
        { message: "Booking ID is required" },
        { status: 400 }
      );
    }

    if (typeof rating !== "number" || rating < 1 || rating > 5) {
      return NextResponse.json(
        { message: "Rating must be a number between 1 and 5" },
        { status: 400 }
      );
    }

    // Check if user can review this booking
    const canReview = await dbCanReviewBooking(bookingId, session.userId);
    if (!canReview.canReview) {
      return NextResponse.json(
        { message: canReview.reason || "Cannot review this booking" },
        { status: 403 }
      );
    }

    const review = await dbCreateReview({
      bookingId,
      menteeUserId: session.userId,
      rating,
      comment: comment?.trim() || null,
    });

    if (!review) {
      return NextResponse.json(
        { message: "Could not create review. The booking may not exist or may not be completed." },
        { status: 400 }
      );
    }

    return NextResponse.json({ review }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/mentorship/reviews]", error);
    return NextResponse.json(
      {
        message: "Failed to submit review",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
