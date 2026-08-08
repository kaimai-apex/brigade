import { Suspense } from "react";
import { WelcomeBanner } from "@/components/auth/welcome-banner";
import { BrandLink } from "@/components/brand/brand-mark";
import { SoundToggle } from "@/components/onboarding/sound-toggle";

/**
 * Onboarding is a corridor: logo + progress + form. No app chrome, tabs, or escapes.
 *
 * The one control in the header is the mute switch. It is the only thing the
 * flow does that someone might want stopped immediately, so it is the only
 * thing that gets to sit above the question.
 */
export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-white text-ink">
      <header className="flex h-14 items-center justify-between border-b border-neutral-100 px-4">
        {/* -mx-2 px-2: keep a 44px thumb target without shifting the mark. */}
        <BrandLink
          markSize={24}
          className="-mx-2 px-2 text-xl text-ink"
        />
        <SoundToggle />
      </header>
      <Suspense fallback={null}>
        <WelcomeBanner />
      </Suspense>
      <div className="mx-auto max-w-lg px-4 py-6">{children}</div>
    </div>
  );
}
