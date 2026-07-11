"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthErrorPanel } from "@/components/auth/auth-error-panel";
import { useAuth } from "@/components/auth/auth-provider";
import { formatAuthError, type AuthErrorDetail } from "@/lib/auth/auth-errors";
import { offerPasswordSave } from "@/lib/auth/offer-password-save";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

function isAuthErrorDetail(data: unknown): data is AuthErrorDetail {
  return (
    typeof data === "object" &&
    data !== null &&
    "message" in data &&
    typeof (data as AuthErrorDetail).message === "string"
  );
}

export function SignupForm() {
  const router = useRouter();
  const { setSession } = useAuth();
  const [error, setError] = useState<AuthErrorDetail | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleEmailSignup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const payload = {
      email: form.get("email")?.toString() ?? "",
      password: form.get("password")?.toString() ?? "",
      firstName: form.get("firstName")?.toString() ?? "",
      lastName: form.get("lastName")?.toString() ?? "",
    };

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(
          isAuthErrorDetail(data)
            ? data
            : formatAuthError(new Error(data.message ?? "Signup failed"), "signup"),
        );
        return;
      }

      await offerPasswordSave(payload.email, payload.password);

      setSession({ userId: data.userId });

      router.push("/onboarding/basic-info");
      router.refresh();
    } catch (err) {
      setError(formatAuthError(err, "proxy"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleEmailSignup}
        method="post"
        action="/api/auth/signup"
        autoComplete="on"
        className="space-y-4"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="firstName">First name</Label>
            <Input
              id="firstName"
              name="firstName"
              autoComplete="given-name"
              required
            />
          </div>
          <div>
            <Label htmlFor="lastName">Last name</Label>
            <Input
              id="lastName"
              name="lastName"
              autoComplete="family-name"
              required
            />
          </div>
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            inputMode="email"
            required
          />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </div>

        {error && <AuthErrorPanel info={error} />}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <p className="text-center text-sm text-ink/65">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-forest underline-offset-2 hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
