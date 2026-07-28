import { NextResponse } from "next/server";
import { JoinWaitlistService } from "@/lib/server/services/join_waitlist_service";

/**
 * Thin by design: read the request, call one service, render one response.
 * Everything that decides anything lives in JoinWaitlistService.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const result = await new JoinWaitlistService().call(body);

    if (!result.ok) {
      return NextResponse.json({ message: result.message }, { status: result.status });
    }

    const { status, ...payload } = result;
    return NextResponse.json(payload, { status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not join waitlist";
    console.error("[waitlist]", message);
    return NextResponse.json(
      { message: "Something went wrong. Try again in a moment." },
      { status: 500 },
    );
  }
}
