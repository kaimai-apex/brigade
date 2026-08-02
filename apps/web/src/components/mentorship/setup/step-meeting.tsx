"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { StepProps } from "./types";

/**
 * Where the session actually happens.
 *
 * Brigade schedules and takes the payment; the call itself happens wherever the
 * mentor already works. A Calendly, Meet, Zoom or Whereby room all work the
 * same way here: the link is held back until the booking is paid for, then
 * copied onto that booking and shown on the receipt.
 *
 * Copied, not referenced — changing this link next year must not rewrite the
 * link on a session that already happened.
 */

const KNOWN = [
  { host: "calendly.com", label: "Calendly" },
  { host: "meet.google.com", label: "Google Meet" },
  { host: "zoom.us", label: "Zoom" },
  { host: "whereby.com", label: "Whereby" },
  { host: "teams.microsoft.com", label: "Microsoft Teams" },
  { host: "meet.jit.si", label: "Jitsi" },
];

/** Names the service, so a pasted link can be sanity-checked at a glance. */
function describe(raw: string): { ok: boolean; label: string } | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return { ok: false, label: "That does not look like a link — include https://" };
  }
  if (url.protocol !== "https:") {
    return { ok: false, label: "Meeting links have to start with https://" };
  }

  const host = url.hostname.replace(/^www\./, "");
  const known = KNOWN.find((entry) => host === entry.host || host.endsWith(`.${entry.host}`));
  return { ok: true, label: known ? `${known.label} link` : `Link to ${host}` };
}

export function StepMeeting({ state, save, setDraft, saving, onNext }: StepProps) {
  const [url, setUrl] = useState(state.mentor?.defaultMeetingUrl ?? "");
  const status = describe(url);

  return (
    <form
      className="space-y-6"
      onSubmit={async (event) => {
        event.preventDefault();
        const ok = await save({ defaultMeetingUrl: url.trim(), onboardingStep: 4 });
        if (ok) onNext();
      }}
    >
      <div>
        <h2 className="text-[20px] font-semibold text-[var(--mk-text)]">Your meeting room</h2>
        <p className="mt-1 text-[14px] text-[var(--mk-muted)]">
          Paste your Calendly, Google Meet, Zoom or Whereby link. Brigade handles the booking
          and the payment; the call happens wherever you already work.
        </p>
      </div>

      <label className="block">
        <span className="text-[13px] font-semibold text-[var(--mk-text)]">Meeting link</span>
        <input
          value={url}
          onChange={(event) => {
            setUrl(event.target.value);
            setDraft({ defaultMeetingUrl: event.target.value });
          }}
          type="url"
          inputMode="url"
          placeholder="https://calendly.com/your-name/mentoring"
          className="mt-1 h-12 w-full rounded-lg border border-[var(--mk-line)] px-3 text-base"
        />
        {status && (
          <span
            className={
              status.ok
                ? "mt-1 block text-[13px] text-[var(--mk-muted)]"
                : "mt-1 block text-[13px] text-[var(--mk-badge-gold-text)]"
            }
          >
            {status.label}
          </span>
        )}
      </label>

      <div className="rounded-xl border border-[var(--mk-line)] bg-[var(--mk-wash)] p-4">
        <p className="text-[14px] font-medium text-[var(--mk-text)]">Who sees this, and when</p>
        <ul className="mt-2 space-y-1.5 text-[14px] text-[var(--mk-muted)]">
          <li>· Nobody sees it while they are browsing — it is not on your public page.</li>
          <li>· It appears on the receipt as soon as a booking is paid for.</li>
          <li>· It is copied onto that booking, so changing it later never rewrites a past session.</li>
        </ul>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={saving || (status !== null && !status.ok)}>
          {saving ? "Saving…" : "Save and continue"}
        </Button>
        <button
          type="button"
          onClick={async () => {
            // Skipping is legitimate: some mentors send a link per booking.
            await save({ onboardingStep: 4 });
            onNext();
          }}
          className="text-[14px] text-[var(--mk-muted)] underline underline-offset-4 hover:text-[var(--mk-text)]"
        >
          I will add one per booking
        </button>
      </div>
    </form>
  );
}
