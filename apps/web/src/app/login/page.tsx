import { LoginForm } from "@/components/auth/login-form";
import { LoginErrorBanner } from "@/components/auth/login-error-banner";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MarketingHeader } from "@/components/layout/marketing-header";
import { NAV_OFFSET_CLASS } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { Suspense } from "react";

export default function LoginPage() {
  return (
    <div className="min-h-dvh bg-[var(--brand-paper-warm)] text-ink">
      <MarketingHeader />
      <div
        className={cn(
          "mx-auto flex min-h-dvh max-w-md items-center px-4 pb-16",
          NAV_OFFSET_CLASS,
        )}
      >
        <Card className="w-full border-[var(--brand-hairline)] shadow-none">
          <CardHeader>
            <CardTitle>Log in to Brigade</CardTitle>
            <CardDescription>
              Enter the email on your account and we&apos;ll send a one-time code. No
              password.
            </CardDescription>
          </CardHeader>
          <Suspense fallback={null}>
            <LoginErrorBanner />
          </Suspense>
          <Suspense fallback={<p className="px-6 pb-6 text-sm text-ink/60">Loading…</p>}>
            <LoginForm />
          </Suspense>
        </Card>
      </div>
    </div>
  );
}
