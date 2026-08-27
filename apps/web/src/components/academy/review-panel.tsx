"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/**
 * The decision controls on one application.
 *
 * Accept is separated from the other outcomes because it is the only one that
 * needs a cohort — the API refuses an acceptance without one, since telling
 * somebody they are in and giving them nowhere to go is the worst version of
 * this screen being wrong.
 */

type Cohort = { id: string; name: string; enrolledCount: number; capacity: number };

export function ReviewPanel({
  applicationId,
  currentStatus,
  currentNotes,
  currentCohortId,
  cohorts,
}: {
  applicationId: string;
  currentStatus: string;
  currentNotes: string | null;
  currentCohortId: string | null;
  cohorts: Cohort[];
}) {
  const router = useRouter();
  const [notes, setNotes] = useState(currentNotes ?? "");
  const [cohortId, setCohortId] = useState(currentCohortId ?? cohorts[0]?.id ?? "");
  const [busy, setBusy] = useState<string | null>(null);

  async function decide(status: string) {
    if (status === "accepted" && !cohortId) {
      toast.error("Pick a cohort first");
      return;
    }
    setBusy(status);
    try {
      const res = await fetch(`/api/admin/applications/${applicationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          adminNotes: notes || undefined,
          cohortId: status === "accepted" ? cohortId : undefined,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) {
        toast.error(json.message ?? "Could not record that");
        return;
      }
      toast.success(
        status === "accepted"
          ? "Accepted and enrolled"
          : `Marked ${status.replace(/_/g, " ")}`,
      );
      router.refresh();
    } catch {
      toast.error("Could not record that");
    } finally {
      setBusy(null);
    }
  }

  const full = cohorts.find((c) => c.id === cohortId);
  const atCapacity = full ? full.enrolledCount >= full.capacity : false;

  return (
    <div className="space-y-5">
      <div>
        <Label htmlFor="adminNotes">Notes</Label>
        <Textarea
          id="adminNotes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          placeholder="What stood out, what you want to ask on a call."
        />
        <p className="mt-1.5 text-xs text-ink/55">
          Saved with whichever decision you record. The applicant never sees this.
        </p>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-4">
        <Label htmlFor="cohort">Place into cohort</Label>
        {cohorts.length === 0 ? (
          <p className="mt-1.5 text-sm text-rust">
            No cohort exists yet. Create one before accepting anybody.
          </p>
        ) : (
          <>
            <select
              id="cohort"
              value={cohortId}
              onChange={(e) => setCohortId(e.target.value)}
              className="mt-1 flex h-12 w-full rounded-xl border border-neutral-200 bg-white px-4 text-sm"
            >
              {cohorts.map((cohort) => (
                <option key={cohort.id} value={cohort.id}>
                  {cohort.name} ({cohort.enrolledCount}/{cohort.capacity})
                </option>
              ))}
            </select>
            {atCapacity && (
              <p className="mt-1.5 text-xs text-rust">
                This cohort is at capacity. Accepting will over-fill it.
              </p>
            )}
          </>
        )}

        <Button
          type="button"
          onClick={() => decide("accepted")}
          disabled={busy !== null || cohorts.length === 0}
          className="mt-3 w-full"
        >
          {busy === "accepted" ? "Accepting…" : "Accept & enrol"}
        </Button>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {[
          { status: "under_review", label: "Mark as reading" },
          { status: "interview", label: "Invite to interview" },
          { status: "waitlisted", label: "Waitlist" },
          { status: "rejected", label: "Decline" },
        ].map((action) => (
          <Button
            key={action.status}
            type="button"
            variant="outline"
            disabled={busy !== null || currentStatus === action.status}
            onClick={() => decide(action.status)}
          >
            {busy === action.status ? "Saving…" : action.label}
          </Button>
        ))}
      </div>

      <p className="text-xs text-ink/55">
        Interview, accept, waitlist and decline each email the applicant.
      </p>
    </div>
  );
}
