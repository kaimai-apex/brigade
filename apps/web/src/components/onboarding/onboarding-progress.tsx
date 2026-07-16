import { ONBOARDING_STEPS, type OnboardingSlug } from "@/lib/types/database";

export function OnboardingProgress({ currentSlug }: { currentSlug: OnboardingSlug }) {
  const currentIndex = ONBOARDING_STEPS.findIndex((s) => s.slug === currentSlug);
  const progress = ((currentIndex + 1) / ONBOARDING_STEPS.length) * 100;

  return (
    <div className="mb-6">
      <p className="mb-2 text-meta font-semibold text-ink/60">
        Step {currentIndex + 1} of {ONBOARDING_STEPS.length}
      </p>
      <div className="h-1 overflow-hidden rounded-full bg-ink/10">
        <div
          className="h-full rounded-full bg-forest transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
