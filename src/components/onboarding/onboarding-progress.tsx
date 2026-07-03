import { ONBOARDING_STEPS, type OnboardingSlug } from "@/lib/types/database";
import { cn } from "@/lib/utils";
import Link from "next/link";

export function OnboardingProgress({ currentSlug }: { currentSlug: OnboardingSlug }) {
  const currentIndex = ONBOARDING_STEPS.findIndex((s) => s.slug === currentSlug);

  return (
    <div className="mb-8">
      <div className="mb-3 flex items-center justify-between text-sm">
        <span className="font-semibold text-forest">
          Step {currentIndex + 1} of {ONBOARDING_STEPS.length}
        </span>
        <span className="text-ink/60">{ONBOARDING_STEPS[currentIndex]?.label}</span>
      </div>
      <div className="flex gap-2">
        {ONBOARDING_STEPS.map((step, index) => (
          <div
            key={step.slug}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors",
              index <= currentIndex ? "bg-forest" : "bg-ink/10",
            )}
          />
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {ONBOARDING_STEPS.map((step, index) => (
          <Link
            key={step.slug}
            href={`/onboarding/${step.slug}`}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition",
              index === currentIndex
                ? "bg-forest text-paper"
                : index < currentIndex
                  ? "bg-sage/60 text-ink"
                  : "bg-ink/5 text-ink/50",
            )}
          >
            {step.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
