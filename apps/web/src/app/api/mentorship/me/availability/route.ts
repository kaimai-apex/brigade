import { NextResponse } from "next/server";
import { getConnectProSession } from "@/lib/connectpro/server";
import { dbListAvailabilityRules, dbReplaceAvailabilityRules } from "@/lib/server/mentorship-db";
import type { AvailabilityRule } from "@/lib/mentorship/availability";

export async function GET() {
  const session = await getConnectProSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ data: await dbListAvailabilityRules(session.userId) });
}

/** Replace the whole weekly grid — the editor always submits all of it. */
export async function PUT(request: Request) {
  const session = await getConnectProSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { rules?: unknown };
  if (!Array.isArray(body.rules)) {
    return NextResponse.json({ message: "rules must be an array" }, { status: 400 });
  }

  const rules: AvailabilityRule[] = [];
  for (const raw of body.rules) {
    const r = raw as Record<string, unknown>;
    if (
      typeof r.weekday !== "number" ||
      typeof r.startMinute !== "number" ||
      typeof r.endMinute !== "number"
    ) {
      return NextResponse.json({ message: "Each rule needs weekday, startMinute, endMinute" }, { status: 400 });
    }
    rules.push({ weekday: r.weekday, startMinute: r.startMinute, endMinute: r.endMinute });
  }

  try {
    await dbReplaceAvailabilityRules(session.userId, rules);
    return NextResponse.json({ data: await dbListAvailabilityRules(session.userId) });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Could not save availability" },
      { status: 400 },
    );
  }
}
