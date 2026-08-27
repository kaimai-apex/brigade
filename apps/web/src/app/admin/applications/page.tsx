import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminPortalSession } from "@/lib/admin/access";
import {
  dbApplicationCounts,
  dbListApplications,
  type ApplicationStatus,
} from "@/lib/server/academy-db";
import { AdminShell } from "@/components/admin/admin-shell";
import { displayName } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Applications · Brigade admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const TABS: { key: ApplicationStatus | "open" | "all"; label: string }[] = [
  { key: "open", label: "Open" },
  { key: "submitted", label: "New" },
  { key: "under_review", label: "Reading" },
  { key: "interview", label: "Interview" },
  { key: "accepted", label: "Accepted" },
  { key: "waitlisted", label: "Waitlisted" },
  { key: "rejected", label: "Declined" },
  { key: "all", label: "All" },
];

const STATUS_TONE: Record<string, string> = {
  draft: "bg-neutral-100 text-ink/60",
  submitted: "bg-gold/20 text-gold-ink",
  under_review: "bg-gold/20 text-gold-ink",
  interview: "bg-sage text-forest",
  accepted: "bg-forest text-paper",
  waitlisted: "bg-neutral-100 text-ink/60",
  rejected: "bg-neutral-100 text-ink/50",
};

export default async function AdminApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await getAdminPortalSession();
  if (!session) notFound();

  const { status } = await searchParams;
  const active = TABS.find((tab) => tab.key === status)?.key ?? "open";

  const [applications, counts] = await Promise.all([
    dbListApplications({
      status: active === "all" ? undefined : (active as ApplicationStatus | "open"),
      limit: 200,
    }),
    dbApplicationCounts(),
  ]);

  const openCount =
    (counts.submitted ?? 0) +
    (counts.under_review ?? 0) +
    (counts.interview ?? 0) +
    (counts.draft ?? 0);

  return (
    <AdminShell email={session.email}>
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-5">
          <Link
            href="/admin"
            className="text-[12px] font-semibold tracking-[0.08em] text-forest"
          >
            ← ADMIN
          </Link>
          <h1 className="font-display mt-1 text-[28px] font-bold tracking-tight md:text-4xl">
            Applications
          </h1>
        </div>

        <div className="-mx-1 mb-5 flex flex-wrap gap-1.5">
          {TABS.map((tab) => {
            const count =
              tab.key === "open"
                ? openCount
                : tab.key === "all"
                  ? Object.values(counts).reduce((sum, n) => sum + n, 0)
                  : (counts[tab.key] ?? 0);
            return (
              <Link
                key={tab.key}
                href={`/admin/applications?status=${tab.key}`}
                className={
                  tab.key === active
                    ? "rounded-full bg-forest px-3.5 py-1.5 text-[13px] font-semibold text-paper"
                    : "rounded-full border border-ink/12 bg-white px-3.5 py-1.5 text-[13px] font-semibold text-ink/70"
                }
              >
                {tab.label}
                <span className="ml-1.5 opacity-60">{count}</span>
              </Link>
            );
          })}
        </div>

        {applications.length === 0 ? (
          <div className="rounded-lg border border-neutral-200 bg-white p-8 text-center text-sm text-ink/60">
            Nothing here yet.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-[11px] uppercase tracking-wide text-ink/50">
                  <th className="px-4 py-2.5 font-semibold">Name</th>
                  <th className="px-4 py-2.5 font-semibold">Experience</th>
                  <th className="px-4 py-2.5 font-semibold">Now</th>
                  <th className="px-4 py-2.5 font-semibold">Where</th>
                  <th className="px-4 py-2.5 font-semibold">Status</th>
                  <th className="px-4 py-2.5 font-semibold">Applied</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((application) => (
                  <tr
                    key={application.id}
                    className="border-b border-neutral-100 last:border-0"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/applications/${application.id}`}
                        className="font-semibold text-forest underline-offset-2 hover:underline"
                      >
                        {displayName(application.firstName, application.lastName) ||
                          application.email ||
                          "Unnamed"}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-ink/70">
                      {application.yearsExperience != null
                        ? `${application.yearsExperience} yrs`
                        : "–"}
                    </td>
                    <td className="px-4 py-3 text-ink/70">
                      {application.currentPosition ?? "–"}
                    </td>
                    <td className="px-4 py-3 text-ink/70">
                      {application.location ?? "–"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          STATUS_TONE[application.status] ?? "bg-neutral-100"
                        }`}
                      >
                        {application.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink/60">
                      {application.submittedAt
                        ? new Date(application.submittedAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })
                        : "not sent"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
