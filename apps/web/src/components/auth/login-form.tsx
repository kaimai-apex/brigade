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

export function LoginForm() {
  const router = useRouter();
  const { setSession } = useAuth();
  const [error, setError] = useState<AuthErrorDetail | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const email = form.get("email")?.toString() ?? "";
    const password = form.get("password")?.toString() ?? "";

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(
          isAuthErrorDetail(data)
            ? data
            : formatAuthError(new Error(data.message ?? "Login failed"), "login"),
        );
        return;
      }

      if (data.mfaRequired) {
        router.push(`/login/mfa?email=${encodeURIComponent(email)}`);
        return;
      }

      await offerPasswordSave(email, password);

      setSession({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        userId: data.userId,
      });

      router.push("/dashboard");
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
        onSubmit={handleSubmit}
        method="post"
        action="/api/auth/login"
        autoComplete="on"
        className="space-y-4"
      >
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="text"
            autoComplete="username"
            required
          />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </div>

        {error && <AuthErrorPanel info={error} />}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Signing in…" : "Log in"}
        </Button>
      </form>

      <p className="text-center text-sm">
        <Link href="/login/forgot-password" className="text-forest underline-offset-2 hover:underline">
          Forgot password?
        </Link>
      </p>

      <p className="text-center text-sm text-ink/65">
        New to Brigade?{" "}
        <Link href="/signup" className="font-semibold text-forest underline-offset-2 hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
