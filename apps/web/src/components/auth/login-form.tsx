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

/**
 * Logging in, in two screens: an address, then six digits mailed to it.
 *
 * Login only works for existing accounts. New emails are nudged to Sign up
 * rather than shown a fake "code sent" screen.
 */

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

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setSession } = useAuth();

  const [stage, setStage] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<AuthErrorDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  /** Only ever set in development with no mail provider — see send-login-code. */
  const [debugCode, setDebugCode] = useState<string | null>(null);
  /** Whether the server has RESEND_API_KEY — not whether this address exists. */
  const [mailConfigured, setMailConfigured] = useState<boolean | null>(null);

  const codeInput = useRef<HTMLInputElement>(null);
  // Guards the auto-submit, which fires from an effect and would otherwise run
  // again on every keystroke after the sixth while the request is in flight.
  const submitting = useRef(false);

  const signupHref = searchParams.get("next")
    ? `/signup?next=${encodeURIComponent(searchParams.get("next")!)}`
    : "/signup";

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((n) => n - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  async function requestCode(address: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/request-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: address }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(
          isAuthErrorDetail(data)
            ? data
            : formatAuthError(new Error(data.message ?? "Could not send a code"), "login"),
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
              : formatAuthError(new Error(data.message ?? "That code did not work"), "login"),
          );
          setCode("");
          codeInput.current?.focus();
          return;
        }

        setSession({ userId: data.userId });
        const next = searchParams.get("next");
        router.push(next && next.startsWith("/") ? next : "/learn");
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

  if (stage === "email") {
    return (
      <div className="space-y-6 px-6 pb-6">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void requestCode(email);
          }}
          className="space-y-4"
        >
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoFocus
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <p className="mt-2 text-sm text-ink/65">
              We&apos;ll email a six-digit code to your existing account. No password.
            </p>
          </div>

          {error?.code === "NOT_FOUND" ? (
            <div
              className="rounded-lg border border-[var(--brand-hairline)] bg-[var(--brand-paper-warm)] px-4 py-3 text-sm text-ink"
              role="alert"
            >
              <p className="font-medium">{error.message}</p>
              <p className="mt-1 text-ink/70">
                <Link
                  href={signupHref}
                  className="font-semibold text-forest underline-offset-2 hover:underline"
                >
                  Create an account
                </Link>{" "}
                to get started.
              </p>
            </div>
          ) : (
            error && <AuthErrorPanel info={error} />
          )}

          <Button type="submit" className="w-full" disabled={loading || !email}>
            {loading ? "Sending…" : "Email Me a Code"}
          </Button>
        </form>

        <p className="text-center text-sm text-ink/65">
          New here?{" "}
          <Link
            href={signupHref}
            className="font-semibold text-forest underline-offset-2 hover:underline"
          >
            Sign up
          </Link>
          .
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
              : `Sent to ${email}. It expires in ten minutes.`}
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
          {loading ? "Checking…" : "Log in"}
        </Button>
      </form>

      <div className="flex items-center justify-between text-sm">
        <button
          type="button"
          onClick={() => {
            setStage("email");
            setError(null);
            setDebugCode(null);
          }}
          className="text-ink/65 underline underline-offset-4 hover:text-ink"
        >
          Use a different email
        </button>
        <button
          type="button"
          onClick={() => void requestCode(email)}
          disabled={cooldown > 0 || loading}
          className="text-forest underline underline-offset-4 disabled:text-ink/40 disabled:no-underline"
        >
          {cooldown > 0 ? `Send it again in ${cooldown}s` : "Send it again"}
        </button>
      </div>
    </div>
  );
}
