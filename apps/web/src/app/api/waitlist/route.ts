import { NextResponse } from "next/server";
import { getPool } from "@connectpro/common";
import { ensureWaitlistSchema } from "@/lib/waitlist/ensure-waitlist-schema";
import { COUNTRY_CODES } from "@/lib/waitlist/country-codes";
import { subscribeToKit } from "@/lib/waitlist/subscribe-to-kit";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[\d\s().+-]{6,24}$/;
const VALID_CODES = new Set<string>(COUNTRY_CODES.map((c) => c.code));

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      email?: string;
      name?: string;
      phone?: string;
      phoneCountry?: string;
      source?: string;
    };

    const email = body.email?.trim().toLowerCase() ?? "";
    const name = body.name?.trim().slice(0, 120) ?? "";
    const phoneRaw = body.phone?.trim() ?? "";
    const phoneCountry = body.phoneCountry?.trim() || "+1";
    const source = body.source?.trim().slice(0, 64) || "landing";

    if (!name || name.length < 2) {
      return NextResponse.json(
        { message: "Enter your name." },
        { status: 400 },
      );
    }

    if (!VALID_CODES.has(phoneCountry)) {
      return NextResponse.json(
        { message: "Pick a valid country code." },
        { status: 400 },
      );
    }

    const phoneDigits = phoneRaw.replace(/\D/g, "");
    if (!phoneRaw || !PHONE_RE.test(phoneRaw) || phoneDigits.length < 6) {
      return NextResponse.json(
        { message: "Enter a valid phone number." },
        { status: 400 },
      );
    }

    if (!email || !EMAIL_RE.test(email)) {
      return NextResponse.json(
        { message: "Enter a valid email address." },
        { status: 400 },
      );
    }

    const phone = `${phoneCountry} ${phoneDigits}`;

    await ensureWaitlistSchema();
    const pool = getPool();

    const result = await pool.query(
      `INSERT INTO public.waitlist_signups (email, name, phone, phone_country, source)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email) DO NOTHING
       RETURNING id`,
      [email, name, phone, phoneCountry, source],
    );

    const inserted = result.rowCount === 1;

    // Kit sync (needs KIT_API_KEY on the deployment). Never block join on Kit.
    const kit = await subscribeToKit({ email, name, phone });
    if (!kit.ok) {
      console.error("[waitlist/kit]", {
        via: kit.via,
        status: kit.status,
        hasApiKey: Boolean(
          process.env.KIT_API_KEY || process.env.CONVERTKIT_API_KEY,
        ),
      });
    }

    return NextResponse.json({
      ok: true,
      alreadyJoined: !inserted,
      kitSynced: kit.ok,
      kitState: kit.subscriberState ?? null,
      message: inserted
        ? "You're on the list. Check your email to confirm."
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
