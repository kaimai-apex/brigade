import Link from "next/link";
import { notFound } from "next/navigation";
import { DemoGateForm } from "@/components/demo/demo-gate-form";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MarketingHeader } from "@/components/layout/marketing-header";
import { isDemoAccessEnabled } from "@/lib/auth/demo-access";
import { NAV_OFFSET_CLASS } from "@/lib/nav";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default function DemoPage() {
  if (!isDemoAccessEnabled()) {
    notFound();
  }

  return (
    <div className="min-h-dvh bg-white text-ink">
      <MarketingHeader />
      <div
        className={cn(
          "mx-auto flex min-h-dvh max-w-md items-center px-4 pb-16",
          NAV_OFFSET_CLASS,
        )}
      >
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
