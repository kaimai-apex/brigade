import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminPortalSession } from "@/lib/admin/access";
import {
  dbGetApplication,
  dbListPlaceableCohorts,
} from "@/lib/server/academy-db";
import { APPLICATION_QUESTIONS } from "@/lib/academy/application-form";
import { ReviewPanel } from "@/components/academy/review-panel";
import { AdminShell } from "@/components/admin/admin-shell";
import { displayName, isUuid } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Application · Brigade admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminApplicationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getAdminPortalSession();
  if (!session) notFound();

  const { id } = await params;
  if (!isUuid(id)) notFound();

  const [application, cohorts] = await Promise.all([
    dbGetApplication(id),
    dbListPlaceableCohorts(),
  ]);
  if (!application) notFound();

  const name =
    displayName(application.firstName, application.lastName) ||
    application.email ||
    "Unnamed applicant";

  const links = [
    application.instagramUrl ? { label: "Instagram", url: application.instagramUrl } : null,
    application.portfolioUrl ? { label: "Portfolio", url: application.portfolioUrl } : null,
    application.resumeUrl ? { label: "Resume", url: application.resumeUrl } : null,
  ].filter(Boolean) as { label: string; url: string }[];

  return (
    <AdminShell email={session.email} section="applications">
      <div className="mx-auto w-full max-w-5xl">
        <Link
          href="/admin/applications"
          className="text-[12px] font-semibold tracking-[0.08em] text-forest"
        >
          ← APPLICATIONS
        </Link>

        <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="font-display text-[28px] font-bold tracking-tight md:text-4xl">
            {name}
          </h1>
          <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-[12px] font-semibold text-ink/70">
            {application.status.replace(/_/g, " ")}
          </span>
        </div>

        <p className="mt-1 text-meta text-ink/60">
          {[
            application.yearsExperience != null
              ? `${application.yearsExperience} years`
              : null,
            application.currentPosition,
            application.location,
            application.email,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>

        {links.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
            {links.map((link) => (
              <a
                key={link.label}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-semibold text-forest underline-offset-2 hover:underline"
              >
                {link.label} ↗
              </a>
            ))}
          </div>
        )}

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_20rem]">
          <div className="space-y-5">
            {/* Rendered by walking the question list, so a question that is
                added or reworded stays in step with what was answered. */}
            {APPLICATION_QUESTIONS.map((question) => {
              const answer = application.answers[question.id];
              if (answer === undefined || answer === "") return null;
              return (
                <div
                  key={question.id}
                  className="rounded-lg border border-neutral-200 bg-white p-4"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-ink/50">
                    {question.label}
                  </p>
                  <p className="mt-1.5 whitespace-pre-line leading-relaxed text-ink/80">
                    {String(answer)}
                  </p>
                </div>
              );
            })}
          </div>

          <aside className="lg:sticky lg:top-6 lg:self-start">
            <ReviewPanel
              applicationId={application.id}
              currentStatus={application.status}
              currentNotes={application.adminNotes}
              currentCohortId={application.cohortId}
              cohorts={cohorts.map((cohort) => ({
                id: cohort.id,
                name: cohort.name,
                enrolledCount: cohort.enrolledCount,
                capacity: cohort.capacity,
              }))}
            />
          </aside>
        </div>
      </div>
    </AdminShell>
  );
}
