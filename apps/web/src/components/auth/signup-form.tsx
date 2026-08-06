"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthErrorPanel } from "@/components/auth/auth-error-panel";
import { useAuth } from "@/components/auth/auth-provider";
import { formatAuthError, type AuthErrorDetail } from "@/lib/auth/auth-errors";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

/** Seconds before "Send it again" becomes available. */
const RESEND_COOLDOWN = 30;

function isAuthErrorDetail(data: unknown): data is AuthErrorDetail {
  return (
    typeof data === "object" &&
    data !== null &&
    "message" in data &&
    typeof (data as AuthErrorDetail).message === "string"
  );
}

/**
 * Sign up: name + email → create passwordless account → six-digit code → session.
 */
export function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setSession } = useAuth();

  const [stage, setStage] = useState<"details" | "code">("details");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<AuthErrorDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [debugCode, setDebugCode] = useState<string | null>(null);
  const [mailConfigured, setMailConfigured] = useState<boolean | null>(null);

  const codeInput = useRef<HTMLInputElement>(null);
  const submitting = useRef(false);

  const loginHref = searchParams.get("next")
    ? `/login?next=${encodeURIComponent(searchParams.get("next")!)}`
    : "/login";

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((n) => n - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  async function createAccountAndSendCode() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, firstName, lastName }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(
          isAuthErrorDetail(data)
            ? data
            : formatAuthError(new Error(data.message ?? "Could not create account"), "signup"),
        );
        return;
      }

      setDebugCode(typeof data.debugCode === "string" ? data.debugCode : null);
      setMailConfigured(
        typeof data.mailConfigured === "boolean" ? data.mailConfigured : null,
      );
      setStage("code");
      setCooldown(RESEND_COOLDOWN);
      setCode("");
      window.setTimeout(() => codeInput.current?.focus(), 0);
    } catch (err) {
      setError(formatAuthError(err, "proxy"));
    } finally {
      setLoading(false);
    }
  }

  async function resendCode() {
    setLoading(true);
    setError(null);
    try {
      // Account already exists from the first step — resend via login path.
      const res = await fetch("/api/auth/request-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          isAuthErrorDetail(data)
            ? data
            : formatAuthError(new Error(data.message ?? "Could not send a code"), "signup"),
        );
        return;
      }
      setDebugCode(typeof data.debugCode === "string" ? data.debugCode : null);
      setMailConfigured(
        typeof data.mailConfigured === "boolean" ? data.mailConfigured : null,
      );
      setCooldown(RESEND_COOLDOWN);
      setCode("");
      window.setTimeout(() => codeInput.current?.focus(), 0);
    } catch (err) {
      setError(formatAuthError(err, "proxy"));
    } finally {
      setLoading(false);
    }
  }

  const verifyCode = useCallback(
    async (value: string) => {
      if (submitting.current) return;
      submitting.current = true;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/auth/verify-code", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, code: value }),
        });
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          setError(
            isAuthErrorDetail(data)
              ? data
              : formatAuthError(new Error(data.message ?? "That code did not work"), "signup"),
          );
          setCode("");
          codeInput.current?.focus();
          return;
        }

        setSession({ userId: data.userId });
        const next = searchParams.get("next");
        const dest =
          next && next.startsWith("/")
            ? `${next}${next.includes("?") ? "&" : "?"}welcome=1`
            : "/onboarding?welcome=1";
        router.push(dest);
        router.refresh();
      } catch (err) {
        setError(formatAuthError(err, "proxy"));
      } finally {
        submitting.current = false;
        setLoading(false);
      }
    },
    [email, router, searchParams, setSession],
  );

  useEffect(() => {
    if (stage === "code" && code.length === 6) void verifyCode(code);
  }, [code, stage, verifyCode]);

  if (stage === "details") {
    return (
      <div className="space-y-6 px-6 pb-6">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void createAccountAndSendCode();
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="firstName">First name</Label>
              <Input
                id="firstName"
                name="firstName"
                autoComplete="given-name"
                autoFocus
                required
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="lastName">Last name</Label>
              <Input
                id="lastName"
                name="lastName"
                autoComplete="family-name"
                required
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <p className="mt-2 text-sm text-ink/65">
              We&apos;ll create your account and email a six-digit code. No password.
            </p>
          </div>

          {error?.code === "CONFLICT" ? (
            <div
              className="rounded-lg border border-[var(--brand-hairline)] bg-[var(--brand-paper-warm)] px-4 py-3 text-sm text-ink"
              role="alert"
            >
              <p className="font-medium">{error.message}</p>
              <p className="mt-1 text-ink/70">
                <Link
                  href={loginHref}
                  className="font-semibold text-forest underline-offset-2 hover:underline"
                >
                  Log in
                </Link>{" "}
                with a code instead.
              </p>
            </div>
          ) : (
            error && <AuthErrorPanel info={error} />
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={loading || !email || !firstName || !lastName}
          >
            {loading ? "Creating…" : "Create account"}
          </Button>
        </form>

        <p className="text-center text-sm text-ink/65">
          Already have an account?{" "}
          <Link
            href={loginHref}
            className="font-semibold text-forest underline-offset-2 hover:underline"
          >
            Log in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-6 pb-6">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void verifyCode(code);
        }}
        className="space-y-4"
      >
        <div>
          <Label htmlFor="code">Six-digit code</Label>
          <Input
            id="code"
            ref={codeInput}
            name="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            required
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
            className="text-center text-2xl tracking-[0.4em]"
          />
          <p className="mt-2 text-sm text-ink/65">
            {mailConfigured === false
              ? "Email delivery isn't configured on this server yet."
              : `Account created — we sent a code to ${email}. It expires in ten minutes.`}
          </p>
        </div>

        {mailConfigured === false && (
          <p className="rounded-lg bg-gold/15 px-3 py-2 text-sm text-ink">
            Add <code className="font-mono text-[13px]">RESEND_API_KEY</code> and{" "}
            <code className="font-mono text-[13px]">RESEND_FROM</code> so codes go
            to your inbox via Resend.
            {debugCode ? (
              <>
                {" "}
                Until then, your code is{" "}
                <strong className="font-mono tracking-widest">{debugCode}</strong>.
              </>
            ) : null}
          </p>
        )}

        {mailConfigured !== false && debugCode && (
          <p className="rounded-lg bg-gold/15 px-3 py-2 text-sm text-ink">
            Dev fallback — your code is{" "}
            <strong className="font-mono tracking-widest">{debugCode}</strong>
          </p>
        )}

        {error && <AuthErrorPanel info={error} />}

        <Button type="submit" className="w-full" disabled={loading || code.length !== 6}>
          {loading ? "Checking…" : "Continue"}
        </Button>
      </form>

      <div className="flex items-center justify-between text-sm">
        <button
          type="button"
          onClick={() => {
            setStage("details");
            setError(null);
            setDebugCode(null);
          }}
          className="text-ink/65 underline underline-offset-4 hover:text-ink"
        >
          Edit details
        </button>
        <button
          type="button"
          onClick={() => void resendCode()}
          disabled={cooldown > 0 || loading}
          className="text-forest underline underline-offset-4 disabled:text-ink/40 disabled:no-underline"
        >
          {cooldown > 0 ? `Send it again in ${cooldown}s` : "Send it again"}
        </button>
      </div>
    </div>
  );
}
