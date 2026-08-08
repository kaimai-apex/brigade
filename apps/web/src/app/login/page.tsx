import { LoginForm } from "@/components/auth/login-form";
import { LoginErrorBanner } from "@/components/auth/login-error-banner";
import { BrandLink } from "@/components/brand/brand-mark";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Suspense } from "react";

export default function LoginPage() {
  return (
    <div className="min-h-dvh bg-[var(--brand-paper-warm)] text-ink">
      <header className="flex h-12 items-center border-b border-[var(--brand-hairline)] bg-white/80 px-4 backdrop-blur-sm">
        <BrandLink markSize={28} />
      </header>
      <div className="mx-auto flex min-h-[calc(100dvh-3rem)] max-w-md items-center px-4 py-8">
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
