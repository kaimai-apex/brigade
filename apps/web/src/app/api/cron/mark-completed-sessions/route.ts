import { NextRequest, NextResponse } from "next/server";
import { dbMarkPastSessionsCompleted } from "@/lib/server/mentorship-db";

/**
 * Cron endpoint to mark past sessions as completed.
 *
 * This runs periodically (e.g., hourly via Vercel Cron) to move confirmed
 * bookings that have ended into the completed state.
 *
 * For security, this endpoint should be protected by Vercel Cron's
 * authorization header or a custom secret.
 *
 * To set up in Vercel:
 * - Add a cron job in vercel.json or Project Settings
 * - Schedule: "0 * * * *" (every hour)
 * - Path: /api/cron/mark-completed-sessions
 */
export async function GET(request: NextRequest) {
  try {
    // Verify request is from Vercel Cron (optional but recommended)
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const count = await dbMarkPastSessionsCompleted();

    return NextResponse.json({
      success: true,
      completedCount: count,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[cron] mark-completed-sessions failed:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// Allow POST as well for manual triggering
export async function POST(request: NextRequest) {
  return GET(request);
}
