import { SignupForm } from "@/components/auth/signup-form";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Suspense } from "react";

export default function SignupPage() {
  return (
    <div className="min-h-dvh bg-[var(--brand-paper-warm)] text-ink">
      <header className="flex h-12 items-center border-b border-[var(--brand-hairline)] bg-white/80 px-4 backdrop-blur-sm">
        <Link
          href="/"
          className="font-display text-xl font-black tracking-tight text-[var(--brand-ink)]"
        >
          Brigade
        </Link>
      </header>
      <div className="mx-auto flex min-h-[calc(100dvh-3rem)] max-w-md items-center px-4 py-8">
        <Card className="w-full border-[var(--brand-hairline)] shadow-none">
          <CardHeader>
            <CardTitle>Create your Brigade account</CardTitle>
            <CardDescription>
              Tell us your name, confirm your email with a one-time code. No password.
            </CardDescription>
          </CardHeader>
          <Suspense fallback={<p className="px-6 pb-6 text-sm text-ink/60">Loading…</p>}>
            <SignupForm />
          </Suspense>
        </Card>
      </div>
    </div>
  );
}
