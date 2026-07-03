import { SiteHeader } from "@/components/layout/site-header";
import Link from "next/link";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-cream">
      <SiteHeader showAuth={false} />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/" className="text-sm font-semibold text-ink/60 hover:text-ink">
            ← Back to home
          </Link>
        </div>
        {children}
      </main>
    </div>
  );
}
