import { NextResponse } from "next/server";
import { getAdminPortalSession } from "@/lib/admin/access";
import { sendApplicationEmail } from "@/lib/academy/send-application-email";
import {
  dbGetUserEmail,
  dbReviewApplication,
  REVIEWABLE_STATUSES,
} from "@/lib/server/academy-db";

/**
 * Record an admin decision on one application.
 *
 * Accepting also creates the cohort seat, in the same transaction — see
 * dbReviewApplication. The email is sent after the transaction commits, and its
 * failure is logged rather than thrown: a decision that is already recorded must
 * not be undone by a mail outage.
 */

const EMAILED_STATUSES = new Set(["accepted", "rejected", "waitlisted", "interview"]);

type ReviewStatus = (typeof REVIEWABLE_STATUSES)[number];

function isReviewStatus(value: unknown): value is ReviewStatus {
  return (
    typeof value === "string" &&
    (REVIEWABLE_STATUSES as readonly string[]).includes(value)
  );
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getAdminPortalSession();
  if (!session) {
    // 404, not 403 — whether this endpoint exists is not a member's business.
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  if (!isReviewStatus(body.status)) {
    return NextResponse.json({ message: "Unknown decision" }, { status: 400 });
  }

  const cohortId =
    typeof body.cohortId === "string" && /^[0-9a-f-]{36}$/i.test(body.cohortId)
      ? body.cohortId
      : null;

  // Accepting someone into no cohort leaves them told-yes with nowhere to go.
  if (body.status === "accepted" && !cohortId) {
    return NextResponse.json(
      { message: "Pick a cohort before accepting." },
      { status: 400 },
    );
  }

  const adminNotes =
    typeof body.adminNotes === "string" ? body.adminNotes.trim().slice(0, 5000) : null;

  try {
    const application = await dbReviewApplication({
      applicationId: id,
      status: body.status,
      reviewerId: null,
      adminNotes,
      cohortId,
    });
    if (!application) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }

    if (EMAILED_STATUSES.has(body.status) && body.notify !== false) {
      const email = await dbGetUserEmail(application.userId).catch(() => null);
      if (email) {
        await sendApplicationEmail({
          to: email,
          kind: body.status as "accepted" | "rejected" | "waitlisted" | "interview",
        });
      }
    }

    return NextResponse.json({ application });
  } catch (error) {
    console.error("[admin/applications] review failed", error);
    return NextResponse.json(
      { message: "Could not record that decision." },
      { status: 500 },
    );
  }
}
