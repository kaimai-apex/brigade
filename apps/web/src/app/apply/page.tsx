import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ApplicationForm } from "@/components/academy/application-form";
import { JournalShell } from "@/components/journal/journal-shell";
import { ACCELERATOR_NAME } from "@/lib/accelerator";
import { getConnectProSession } from "@/lib/connectpro/server";

export const metadata: Metadata = {
  title: `Apply · ${ACCELERATOR_NAME}`,
  description:
    "Apply to the Brigade Private Chef Accelerator. Eight weeks with working private chefs, from restaurant kitchens to paid private clients.",
};

export const dynamic = "force-dynamic";

/**
 * The application.
 *
 * Requires an account, so answers, resume and any later enrolment all hang off
 * one identity instead of being reconciled by email address after the fact.
 * Someone arriving logged-out is sent to sign up and returned here.
 */
export default async function ApplyPage() {
  const session = await getConnectProSession();
  if (!session) redirect("/signup?next=%2Fapply");

  return (
    <JournalShell>
      <div className="mx-auto max-w-[720px]">
        <p className="text-[12px] font-semibold tracking-[0.08em] text-[var(--brand-forest)]">
          APPLY
        </p>
        <h1 className="font-display mt-3 max-w-[20ch] text-[36px] font-bold leading-[1.1] tracking-tight md:text-[42px]">
          {ACCELERATOR_NAME}
        </h1>
        <p className="mt-4 max-w-[52ch] text-[18px] leading-relaxed text-[var(--brand-ink-muted)]">
          Eight weeks with chefs who already do this work. Pricing, clients,
          operations, and the first dinners on the calendar. Tell us where you
          are now.
        </p>

        <div className="mt-10">
          <ApplicationForm />
        </div>
      </div>
    </JournalShell>
  );
}
