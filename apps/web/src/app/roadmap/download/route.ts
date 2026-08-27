import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { viewerHasResourceAccess } from "@/lib/journal/access";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await viewerHasResourceAccess())) {
    return new NextResponse("Not found", { status: 404 });
  }

  const filePath = path.join(
    process.cwd(),
    "src/content/roadmap/private-chef-roadmap.svg",
  );
  const body = await readFile(filePath);

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Content-Length": String(body.byteLength),
      "Cache-Control": "private, no-store",
      "Content-Disposition": 'inline; filename="private-chef-roadmap.svg"',
      "X-Content-Type-Options": "nosniff",
    },
  });
}
