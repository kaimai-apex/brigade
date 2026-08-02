import { NextResponse } from "next/server";
import { dbListMentors, type MentorSort } from "@/lib/server/mentorship-db";

const SORTS = new Set<MentorSort>(["price", "name", "newest"]);

/** Public mentor directory: GET /api/mentorship/mentors?q=&role=&city=&expertise=&sort=&maxPrice=&offset= */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const maxPrice = Number(params.get("maxPrice"));
  const sortRaw = params.get("sort") ?? "price";
  const sort = SORTS.has(sortRaw as MentorSort) ? (sortRaw as MentorSort) : "price";

  try {
    const result = await dbListMentors({
      q: params.get("q") ?? undefined,
      role: params.get("role") ?? undefined,
      city: params.get("city") ?? undefined,
      expertise: params.get("expertise") ?? undefined,
      maxPriceCents: Number.isFinite(maxPrice) && maxPrice > 0 ? maxPrice : undefined,
      sort,
      limit: Number(params.get("limit")) || 24,
      offset: Number(params.get("offset")) || 0,
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error("[mentorship/mentors]", error instanceof Error ? error.message : error);
    return NextResponse.json({ data: [], total: 0 });
  }
}
