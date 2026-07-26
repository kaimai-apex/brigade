import Link from "next/link";
import { notFound } from "next/navigation";
import { DemoGateForm } from "@/components/demo/demo-gate-form";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isDemoAccessEnabled } from "@/lib/auth/demo-access";

/**
 * Password gate for the shared product demo. One password lets anyone walk
 * through the app as the demo member — no account, no waitlist.
 */

export const dynamic = "force-dynamic";

export default function DemoPage() {
  if (!isDemoAccessEnabled()) {
    notFound();
  }

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
      <div className="mx-auto flex min-h-[calc(100dvh-3rem)] max-w-md items-center px-4 py-8">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>See the demo</CardTitle>
            <CardDescription>
              Enter the demo password to look around Brigade. No account needed.
            </CardDescription>
          </CardHeader>
          <DemoGateForm />
          <p className="px-6 pb-6 text-center text-sm text-ink/65">
            Want your own profile?{" "}
            <Link
              href="/waitlist"
              className="font-semibold text-forest underline-offset-2 hover:underline"
            >
              Join the waitlist
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
