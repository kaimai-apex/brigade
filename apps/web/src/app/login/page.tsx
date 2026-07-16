import { LoginForm } from "@/components/auth/login-form";
import { LoginErrorBanner } from "@/components/auth/login-error-banner";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Suspense } from "react";

export default function LoginPage() {
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
            <CardTitle>Welcome back</CardTitle>
            <CardDescription>Log in to your Brigade profile.</CardDescription>
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
