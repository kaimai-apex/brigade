"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ResourceGate({
  resourceSlug,
  kicker = "CONTINUE READING",
  heading = "Leave your email to read the rest.",
  body = "Free notes from a chef who already runs a house. One email, then the journal and the roadmap are open on this browser.",
  submitLabel = "Open the resources",
  children,
}: {
  resourceSlug: string;
  kicker?: string;
  heading?: string;
  body?: string;
  submitLabel?: string;
  children?: ReactNode;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fieldId = `resource-email-${resourceSlug}`;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/journal/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, articleSlug: resourceSlug }),
      });
      const json = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) {
        setError(json.message || "That email did not go through.");
        return;
      }
      router.refresh();
    } catch {
      setError("Could not save that email. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {children}

      <form
        onSubmit={onSubmit}
        className={
          children
            ? "relative z-10 -mt-6 rounded-2xl bg-[var(--brand-cream)] px-5 py-6 md:px-7 md:py-8"
            : "relative z-10 rounded-2xl bg-[var(--brand-cream)] px-5 py-6 md:px-7 md:py-8"
        }
      >
        <p className="text-[12px] font-semibold tracking-[0.08em] text-[var(--brand-forest)]">
          {kicker}
        </p>
        <h2 className="font-display mt-2 text-[22px] font-semibold tracking-tight md:text-[24px]">
          {heading}
        </h2>
        <p className="mt-2 text-[15px] leading-relaxed text-[var(--brand-ink-muted)]">
          {body}
        </p>
        <label className="sr-only" htmlFor={fieldId}>
          Email
        </label>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Input
            id={fieldId}
            type="email"
            name="email"
            required
            autoComplete="email"
            placeholder="you@kitchen.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="bg-[var(--brand-paper-warm)]"
          />
          <Button type="submit" disabled={busy} className="shrink-0 sm:w-auto">
            {busy ? "Opening…" : submitLabel}
          </Button>
        </div>
        {error ? (
          <p className="mt-3 text-[14px] text-[var(--brand-rust)]">{error}</p>
        ) : null}
      </form>
    </div>
  );
}
