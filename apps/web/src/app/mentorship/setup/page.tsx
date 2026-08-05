import { Suspense } from "react";
import { AppPage } from "@/components/layout/app-shell";
import { SetupWizard } from "@/components/mentorship/setup/setup-wizard";

export const dynamic = "force-dynamic";

/**
 * Become a mentor.
 *
 * `useSearchParams` in the wizard needs a Suspense boundary, since the step is
 * read from the URL and is not known at prerender time.
 */
export default function MentorSetupPage() {
  return (
    <AppPage>
      <Suspense fallback={<p className="text-[var(--mk-muted)]">Loading…</p>}>
        <SetupWizard />
      </Suspense>
    </AppPage>
  );
}
