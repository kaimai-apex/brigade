import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { CopyEmails } from "@/components/admin/admin-actions";
import { getAdminPortalSession } from "@/lib/admin/access";
import {
  dbAdminOverview,
  dbListJournalSubscribers,
  dbListWaitlistSignups,
} from "@/lib/server/admin-db";

export const metadata: Metadata = {
  title: "Admin · Brigade",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function when(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function AdminPage() {
  const session = await getAdminPortalSession();
  if (!session) notFound();

  const [overview, journal, waitlist] = await Promise.all([
    dbAdminOverview(),
    dbListJournalSubscribers(),
    dbListWaitlistSignups(),
  ]);

  return (
    <AdminShell email={session.email}>
      <p className="text-[12px] font-semibold tracking-[0.08em] text-[var(--brand-forest)]">
        ADMIN
      </p>
      <h1 className="font-display mt-1 text-[28px] font-bold tracking-tight md:text-4xl">
        Emails
      </h1>
      <p className="mt-2 max-w-[52ch] text-[15px] text-[var(--brand-ink-muted)]">
        Everyone who left an address on the journal wall or the waitlist.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Journal emails" value={overview.journal.total} />
        <Stat label="Journal · 7 days" value={overview.journal.newLast7} />
        <Stat label="Waitlist" value={overview.waitlist.total} />
        <Stat label="Waitlist · 7 days" value={overview.waitlist.newLast7} />
      </div>

      <section className="mt-8 rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="font-display text-xl font-bold">Journal wall</h2>
          <CopyEmails emails={journal.map((row) => row.email)} />
        </div>
        {journal.length === 0 ? (
          <p className="text-sm text-ink/60">Nobody has unlocked the journal yet.</p>
        ) : (
          <div className="-mx-5 overflow-x-auto px-5">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-[11px] uppercase tracking-wide text-ink/50">
                  <th className="py-2 pr-4 font-semibold">Email</th>
                  <th className="py-2 pr-4 font-semibold">Opened from</th>
                  <th className="py-2 font-semibold">When</th>
                </tr>
              </thead>
              <tbody>
                {journal.map((row) => (
                  <tr key={`${row.email}-${row.createdAt}`} className="border-b border-neutral-100">
                    <td className="py-2.5 pr-4 font-medium">
                      <a
                        href={`mailto:${row.email}`}
                        className="text-forest underline-offset-2 hover:underline"
                      >
                        {row.email}
                      </a>
                    </td>
                    <td className="py-2.5 pr-4 text-ink/70">
                      {row.articleSlug ?? "—"}
                    </td>
                    <td className="py-2.5 text-ink/60">{when(row.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-6 rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="font-display text-xl font-bold">Waitlist</h2>
          <CopyEmails emails={waitlist.map((row) => row.email)} />
        </div>
        {waitlist.length === 0 ? (
          <p className="text-sm text-ink/60">The waitlist is empty.</p>
        ) : (
          <div className="-mx-5 overflow-x-auto px-5">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-[11px] uppercase tracking-wide text-ink/50">
                  <th className="py-2 pr-4 font-semibold">Email</th>
                  <th className="py-2 pr-4 font-semibold">Name</th>
                  <th className="py-2 pr-4 font-semibold">Source</th>
                  <th className="py-2 font-semibold">When</th>
                </tr>
              </thead>
              <tbody>
                {waitlist.map((row) => (
                  <tr key={`${row.email}-${row.createdAt}`} className="border-b border-neutral-100">
                    <td className="py-2.5 pr-4 font-medium">
                      <a
                        href={`mailto:${row.email}`}
                        className="text-forest underline-offset-2 hover:underline"
                      >
                        {row.email}
                      </a>
                    </td>
                    <td className="py-2.5 pr-4 text-ink/70">{row.name || "—"}</td>
                    <td className="py-2.5 pr-4 text-ink/70">{row.source ?? "—"}</td>
                    <td className="py-2.5 text-ink/60">{when(row.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AdminShell>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-3.5 shadow-sm">
      <p className="font-display text-[22px] font-bold leading-none tracking-tight">
        {value.toLocaleString()}
      </p>
      <p className="mt-1.5 text-[12px] leading-tight text-ink/60">{label}</p>
    </div>
  );
}
