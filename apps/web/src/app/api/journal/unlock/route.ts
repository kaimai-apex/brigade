import { NextResponse } from "next/server";
import {
  JOURNAL_UNLOCK_COOKIE,
  normalizeJournalEmail,
} from "@/lib/journal/email";
import { sanitizeResourceSlug } from "@/lib/journal/resource-slug";
import {
  countRecentJournalSubscribers,
  journalSubscriberExists,
  saveJournalSubscriber,
} from "@/lib/journal/subscribers";
import { signResourceUnlock } from "@/lib/journal/unlock-cookie";

const RECENT_WINDOW_MINUTES = 10;
const RECENT_INSERT_CAP = 80;

export async function POST(request: Request) {
  try {
    const secret = process.env.JWT_SECRET?.trim();
    if (!secret) {
      console.error("[journal/unlock] JWT_SECRET is not set");
      return NextResponse.json(
        { message: "Could not save that email. Try again in a moment." },
        { status: 500 },
      );
    }

    const body = (await request.json().catch(() => ({}))) as {
      email?: unknown;
      articleSlug?: unknown;
    };
    const email = normalizeJournalEmail(body.email);
    if (!email) {
      return NextResponse.json(
        { message: "Enter a valid email address." },
        { status: 400 },
      );
    }

    const known = await journalSubscriberExists(email);
    if (!known) {
      const recent = await countRecentJournalSubscribers(RECENT_WINDOW_MINUTES);
      if (recent >= RECENT_INSERT_CAP) {
        return NextResponse.json(
          { message: "Too many people just signed up. Try again in a few minutes." },
          { status: 429 },
        );
      }
    }

    await saveJournalSubscriber({
      email,
      articleSlug: sanitizeResourceSlug(body.articleSlug) ?? undefined,
    });

    const token = await signResourceUnlock(secret);
    const response = NextResponse.json({ ok: true });
    response.cookies.set(JOURNAL_UNLOCK_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
    return response;
  } catch (error) {
    console.error(
      "[journal/unlock]",
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json(
      { message: "Could not save that email. Try again in a moment." },
      { status: 500 },
    );
  }
}
