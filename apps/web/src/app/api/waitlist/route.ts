import { NextResponse } from "next/server";
import { getPool } from "@connectpro/common";
import { ensureWaitlistSchema } from "@/lib/waitlist/ensure-waitlist-schema";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      email?: string;
      name?: string;
      source?: string;
    };

    const email = body.email?.trim().toLowerCase() ?? "";
    const name = body.name?.trim().slice(0, 120) || null;
    const source = body.source?.trim().slice(0, 64) || "landing";

    if (!email || !EMAIL_RE.test(email)) {
      return NextResponse.json(
        { message: "Enter a valid email address." },
        { status: 400 },
      );
    }

    await ensureWaitlistSchema();
    const pool = getPool();

    const result = await pool.query(
      `INSERT INTO public.waitlist_signups (email, name, source)
       VALUES ($1, $2, $3)
       ON CONFLICT (email) DO NOTHING
       RETURNING id`,
      [email, name, source],
    );

    const inserted = result.rowCount === 1;

    return NextResponse.json({
      ok: true,
      alreadyJoined: !inserted,
      message: inserted
        ? "You're on the list. We'll be in touch."
        : "You're already on the waitlist — talk soon.",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not join waitlist";
    console.error("[waitlist]", message);
    return NextResponse.json(
      { message: "Something went wrong. Try again in a moment." },
      { status: 500 },
    );
  }
}
