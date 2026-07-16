import Link from "next/link";

/**
 * Onboarding is a corridor: logo + progress + form. No app chrome, tabs, or escapes.
 */
export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-white text-ink">
      <header className="flex h-12 items-center border-b border-neutral-100 px-4">
        <Link
          href="/"
          className="font-display text-xl font-black tracking-tight text-ink"
        >
          Brigade
        </Link>
      </header>
      <div className="mx-auto max-w-lg px-4 py-6">{children}</div>
    </div>
  );
}
