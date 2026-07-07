"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GoogleAuthButton } from "@/components/auth/google-auth-button";
import { useAuth } from "@/components/auth/auth-provider";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function SignupForm() {
  const router = useRouter();
  const { setSession } = useAuth();
  const [error, setError] = useState<string | null>(null);
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
        setError(data.message ?? "Signup failed");
        return;
      }

      setSession({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        userId: data.userId,
      });

      router.push("/onboarding/basic-info");
      router.refresh();
    } catch {
      setError("Could not reach auth service. Is the API running?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleEmailSignup} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="firstName">First name</Label>
            <Input id="firstName" name="firstName" required />
          </div>
          <div>
            <Label htmlFor="lastName">Last name</Label>
            <Input id="lastName" name="lastName" required />
          </div>
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" minLength={8} required />
        </div>

        {error && <p className="text-sm text-rust">{error}</p>}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-ink/10" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-paper px-2 text-ink/50">or</span>
        </div>
      </div>

      <GoogleAuthButton
        redirectTo="/onboarding/basic-info"
        disabled={loading}
        onError={setError}
      />

      <p className="text-center text-sm text-ink/65">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-forest underline-offset-2 hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
