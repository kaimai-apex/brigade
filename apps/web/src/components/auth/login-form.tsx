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
 * There is no password field because there is no password. Nothing to forget,
 * nothing to reset, nothing reused from a breach somewhere else, and nothing
 * for Brigade to store — the mailbox is the credential.
 *
 * The cost of that is one extra screen, so the second screen has to be
 * frictionless: the field takes a paste of the whole code, submits itself on
 * the sixth digit, and asks the browser for the code by autocomplete so iOS and
 * Chrome can offer it straight from the notification.
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

  const codeInput = useRef<HTMLInputElement>(null);
  // Guards the auto-submit, which fires from an effect and would otherwise run
  // again on every keystroke after the sixth while the request is in flight.
  const submitting = useRef(false);

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
      setStage("code");
      setCooldown(RESEND_COOLDOWN);
      setCode("");
      // The field the person is about to use, focused for them.
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
          // Cleared and refocused: the next thing they do is type it again, and
          // leaving a wrong code in the box means deleting it first.
          setCode("");
          codeInput.current?.focus();
          return;
        }

        setSession({ userId: data.userId });
        const next = searchParams.get("next");
        router.push(next && next.startsWith("/") ? next : "/mentors");
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

  // Six digits is the whole answer, so there is nothing left to confirm.
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
              We will email you a six-digit code. No password needed.
            </p>
          </div>

          {error && <AuthErrorPanel info={error} />}

          <Button type="submit" className="w-full" disabled={loading || !email}>
            {loading ? "Sending…" : "Email me a code"}
          </Button>
        </form>

        <p className="text-center text-sm text-ink/65">
          New to Brigade?{" "}
          <Link
            href="/waitlist"
            className="font-semibold text-forest underline-offset-2 hover:underline"
          >
            Join the waitlist
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
            // The reason iOS and Chrome offer the code from the notification
            // without the person opening their mail at all.
            autoComplete="one-time-code"
            maxLength={6}
            required
            value={code}
            // Digits only, from typing or from a paste of the whole line.
            onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
            className="text-center text-2xl tracking-[0.4em]"
          />
          <p className="mt-2 text-sm text-ink/65">
            Sent to {email}. It expires in ten minutes.
          </p>
        </div>

        {/* Development only: with no mail provider configured there is no
            inbox to read, so the code is shown rather than lost. The server
            only ever returns it when NODE_ENV is not production. */}
        {debugCode && (
          <p className="rounded-lg bg-gold/15 px-3 py-2 text-sm text-ink">
            No mail provider configured — your code is{" "}
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
          {/* Counted down out loud, so a wait is never an unexplained dead
              control. */}
          {cooldown > 0 ? `Send it again in ${cooldown}s` : "Send it again"}
        </button>
      </div>
    </div>
  );
}
