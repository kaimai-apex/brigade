import { ServerAppPage } from "@/components/layout/server-app-page";
import Link from "next/link";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ServerAppPage showAuth={false} className="max-w-3xl py-10">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/" className="text-sm font-semibold text-ink/60 hover:text-ink">
            ← Back to home
          </Link>
        </div>
        {children}
      </ServerAppPage>
  );
}
