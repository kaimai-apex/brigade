import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getConnectProSession } from "@/lib/connectpro/server";
import { MenteeFlow } from "@/components/onboarding/mentee-flow";

export const dynamic = "force-dynamic";

/**
 * Member onboarding.
 *
 * This was a redirect into a six-step profile form. It is now the flow itself:
 * the step is a query parameter and every screen is rendered from the
 * definitions in lib/onboarding/mentee-steps.ts.
 *
 * The deeper profile steps (experience, education, portfolio) still exist at
 * their own routes and are offered AFTER this, rather than standing between a
 * new member and the first mentor they see. Nothing was deleted — the order
 * changed.
 */
export default async function OnboardingPage() {
  const session = await getConnectProSession();
  if (!session) redirect("/login?next=/onboarding");

  return (
    <Suspense fallback={<p className="text-ink/50">Loading…</p>}>
      <MenteeFlow />
    </Suspense>
  );
}
