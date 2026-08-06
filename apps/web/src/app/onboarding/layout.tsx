import Link from "next/link";
import { Suspense } from "react";
import { WelcomeBanner } from "@/components/auth/welcome-banner";
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
        <Link
          href="/"
          // -mx-2 px-2: the wordmark is 28px tall, and the only way out of the
          // corridor should not be the one control on the screen too small to
          // hit with a thumb. Padding gives it a 44px target without moving it.
          className="font-display -mx-2 flex min-h-11 items-center px-2 text-xl font-black tracking-tight text-ink"
        >
          Brigade
        </Link>
        <SoundToggle />
      </header>
      <Suspense fallback={null}>
        <WelcomeBanner />
      </Suspense>
      <div className="mx-auto max-w-lg px-4 py-6">{children}</div>
    </div>
  );
}
