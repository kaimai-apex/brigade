"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function WaitlistForm({
  source = "landing",
  className,
}: {
  source?: string;
  className?: string;
}) {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">(
    "idle",
  );
  const [message, setMessage] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setMessage("");

    const form = new FormData(e.currentTarget);
    const email = form.get("email")?.toString() ?? "";
    const name = form.get("name")?.toString() ?? "";

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, source }),
      });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) {
        setStatus("error");
        setMessage(data.message ?? "Could not join waitlist");
        return;
      }
      setStatus("done");
      setMessage(data.message ?? "You're on the list.");
      e.currentTarget.reset();
    } catch {
      setStatus("error");
      setMessage("Network error — try again.");
    }
  }

  if (status === "done") {
    return (
      <div
        className={className}
        role="status"
        aria-live="polite"
      >
        <p className="rounded-md border border-forest/20 bg-forest/5 px-4 py-3 text-sm font-medium text-ink">
          {message}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className={className}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1 space-y-1.5">
          <Label htmlFor="waitlist-name" className="sr-only">
            Name
          </Label>
          <Input
            id="waitlist-name"
            name="name"
            type="text"
            autoComplete="name"
            placeholder="Name (optional)"
            className="min-h-11"
          />
        </div>
        <div className="min-w-0 flex-[1.4] space-y-1.5">
          <Label htmlFor="waitlist-email" className="sr-only">
            Email
          </Label>
          <Input
            id="waitlist-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@email.com"
            className="min-h-11"
          />
        </div>
        <Button type="submit" size="lg" className="min-h-11 w-full sm:w-auto" disabled={status === "loading"}>
          {status === "loading" ? "Joining…" : "Join the waitlist"}
        </Button>
      </div>
      {status === "error" && (
        <p className="mt-2 text-sm text-rust" role="alert">
          {message}
        </p>
      )}
    </form>
  );
}
