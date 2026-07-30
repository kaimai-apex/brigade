import { NextResponse } from "next/server";
import { getConnectProSession } from "@/lib/connectpro/server";
import { dbDeleteException } from "@/lib/server/mentorship-db";

/** Remove a block: DELETE /api/mentorship/me/exceptions/:id */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getConnectProSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    await dbDeleteException(id, session.userId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Could not remove" },
      { status: 400 },
    );
  }
}
