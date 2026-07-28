"use client";

import { useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  KitWaitlistBridge,
  submitToKitBridge,
} from "@/components/waitlist/kit-waitlist-embed";
import {
  COUNTRIES,
  DEFAULT_COUNTRY_ISO,
  countryByIso,
} from "@/lib/waitlist/country-codes";
import { burstCelebration } from "@/lib/waitlist/celebrate";
import { cn } from "@/lib/utils";

export function WaitlistForm({
  source = "landing",
  className,
  onSuccess,
}: {
  source?: string;
  className?: string;
  onSuccess?: () => void;
}) {
  const id = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">(
    "idle",
  );
  const [message, setMessage] = useState("");
  // The ISO code is the selection, because a dialing code is not unique — +1
  // alone covers 25 territories, so it cannot identify an option.
  const [countryIso, setCountryIso] = useState(DEFAULT_COUNTRY_ISO);
  const country = countryByIso(countryIso);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setMessage("");

    const form = new FormData(e.currentTarget);
    const email = form.get("email")?.toString() ?? "";
    const name = form.get("name")?.toString() ?? "";
    const phone = form.get("phone")?.toString() ?? "";

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          name,
          phone,
          phoneCountry: country?.dial ?? "+1",
          // Sent alongside the dialing code so the number can be validated
          // against the actual country. The dialing code stays the stored
          // value, unchanged, so existing rows keep their shape.
          phoneCountryIso: countryIso,
          source,
        }),
      });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) {
        setStatus("error");
        setMessage(data.message ?? "Could not join waitlist");
        return;
      }

      // Sync to Kit email list (cofounder form) via their browser JS.
      const phoneE164 = `${country?.dial ?? "+1"} ${phone.replace(/\D/g, "")}`;
      submitToKitBridge({ email, name, phone: phoneE164 });

      if (buttonRef.current) {
        burstCelebration(buttonRef.current);
      }
      onSuccess?.();

      // Let the burst land, then reveal thank-you
      window.setTimeout(() => {
        setStatus("done");
      }, 280);
    } catch {
      setStatus("error");
      setMessage("Network error — try again.");
    }
  }

  if (status === "done") {
    return (
      <div
        className={cn("waitlist-thanks text-center", className)}
        role="status"
        aria-live="polite"
      >
        <div
          className="waitlist-thanks-art relative mx-auto mb-6 flex size-32 items-center justify-center overflow-hidden rounded-full bg-white/70 sm:size-40"
          aria-hidden
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/hero/chef-bartender.png"
            alt=""
            className="h-[88%] w-[88%] object-contain"
          />
        </div>
        <h2 className="font-display text-[clamp(26px,7vw,40px)] font-black leading-[1.08] tracking-tight px-1">
          Thank you for joining Brigade!
        </h2>
        <p className="mx-auto mt-4 max-w-sm px-1 text-base font-medium leading-relaxed text-ink/80">
          Check your email to confirm, then we&apos;ll let you know when
          it&apos;s available.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Rendered as a SIBLING, not a child. KitWaitlistBridge contains its own
          <form>, and a nested form is invalid HTML — the browser discards the
          inner one while parsing, so the server markup and the hydrated tree
          disagree and React throws a hydration error on every waitlist view. */}
      <KitWaitlistBridge />
      <form onSubmit={onSubmit} className={className}>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor={`${id}-name`}>Name</Label>
            <Input
              id={`${id}-name`}
              name="name"
              type="text"
              autoComplete="name"
              required
              placeholder="Your name"
              className="min-h-11"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`${id}-phone`}>Phone</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <select
                id={`${id}-country`}
                name="phoneCountry"
                value={countryIso}
                onChange={(e) => setCountryIso(e.target.value)}
                aria-label="Country"
                className="h-11 w-full shrink-0 rounded-xl border border-ink/15 bg-white px-3 text-base text-ink outline-none focus-visible:border-forest focus-visible:ring-2 focus-visible:ring-forest/20 sm:w-auto sm:max-w-[14rem] sm:min-w-[11rem] sm:text-sm"
              >
                {COUNTRIES.map((c) => (
                  <option key={c.iso} value={c.iso}>
                    {c.flag} {c.name} ({c.dial})
                  </option>
                ))}
              </select>
              <Input
                id={`${id}-phone`}
                name="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel-national"
                required
                placeholder="Phone number"
                className="min-h-11 min-w-0 flex-1"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`${id}-email`}>Email</Label>
            <Input
              id={`${id}-email`}
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@email.com"
              className="min-h-11"
            />
          </div>

          <Button
            ref={buttonRef}
            type="submit"
            variant="gold"
            size="lg"
            className="relative min-h-11 w-full border-2 border-ink"
            disabled={status === "loading"}
          >
            {status === "loading" ? "Joining…" : "Join Waitlist"}
          </Button>
        </div>
        {status === "error" && (
          <p className="mt-2 text-sm text-rust" role="alert">
            {message}
          </p>
        )}
      </form>
    </>
  );
}
