"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { PROFESSIONAL_ROLES } from "@/lib/types/database";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function SignupForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const email = form.get("email")?.toString() ?? "";
    const password = form.get("password")?.toString() ?? "";

    const firstName = form.get("first_name")?.toString() ?? "";
    const lastName = form.get("last_name")?.toString() ?? "";
    const role = form.get("role")?.toString() ?? "";
    const city = form.get("city")?.toString() ?? "";
    const state = form.get("state")?.toString() ?? "";
    const country = form.get("country")?.toString() ?? "";

    const supabase = createClient();
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          role,
          city,
          state,
          country,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding/basic-info`,
      },
    });

    if (!signUpError && signUpData.user) {
      await supabase
        .from("profiles")
        .update({
          first_name: firstName,
          last_name: lastName,
          role,
          city,
          state,
          country,
        })
        .eq("id", signUpData.user.id);
    }

    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    router.push("/onboarding/basic-info");
    router.refresh();
  }

  async function handleGoogleSignup() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/onboarding/basic-info`,
      },
    });
    if (oauthError) {
      setError(oauthError.message);
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="first_name">First name</Label>
            <Input id="first_name" name="first_name" required />
          </div>
          <div>
            <Label htmlFor="last_name">Last name</Label>
            <Input id="last_name" name="last_name" required />
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

        <div>
          <Label htmlFor="role">Professional role</Label>
          <Select id="role" name="role" required defaultValue="">
            <option value="" disabled>
              Select your role
            </option>
            {PROFESSIONAL_ROLES.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="city">City</Label>
            <Input id="city" name="city" required />
          </div>
          <div>
            <Label htmlFor="state">State</Label>
            <Input id="state" name="state" />
          </div>
          <div>
            <Label htmlFor="country">Country</Label>
            <Input id="country" name="country" required />
          </div>
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

      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={handleGoogleSignup}
        disabled={loading}
      >
        Continue with Google
      </Button>

      <p className="text-center text-sm text-ink/65">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-forest underline-offset-2 hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
