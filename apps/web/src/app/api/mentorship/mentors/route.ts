import { NextResponse } from "next/server";
import { getConnectProSession } from "@/lib/connectpro/server";
import { dbListMentors } from "@/lib/server/mentorship-db";

/** The mentor directory: GET /api/mentorship/mentors?q=&role=&maxPrice=&offset= */
export async function GET(request: Request) {
  const session = await getConnectProSession();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const params = new URL(request.url).searchParams;
  const maxPrice = Number(params.get("maxPrice"));

  try {
    const result = await dbListMentors({
      q: params.get("q") ?? undefined,
      role: params.get("role") ?? undefined,
      maxPriceCents: Number.isFinite(maxPrice) && maxPrice > 0 ? maxPrice : undefined,
      limit: Number(params.get("limit")) || 24,
      offset: Number(params.get("offset")) || 0,
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error("[mentorship/mentors]", error instanceof Error ? error.message : error);
    return NextResponse.json({ data: [], total: 0 });
  }
}
