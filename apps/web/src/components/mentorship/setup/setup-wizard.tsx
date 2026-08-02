"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SETUP_STEPS, stepIndex } from "@/lib/mentorship/readiness";
import { MentorCardPreview } from "./card-preview";
import { StepProfile } from "./step-profile";
import { StepSessions } from "./step-sessions";
import { StepHours } from "./step-hours";
import { StepMeeting } from "./step-meeting";
import { StepPayouts } from "./step-payouts";
import { StepReview } from "./step-review";
import type { SetupDraft, SetupState, StepProps } from "./types";

const STEP_COMPONENTS: Record<string, (props: StepProps) => React.ReactNode> = {
  profile: StepProfile,
  sessions: StepSessions,
  hours: StepHours,
  meeting: StepMeeting,
  payouts: StepPayouts,
  review: StepReview,
};

const EMPTY_PROFILE = {
  firstName: null,
  lastName: null,
  avatarUrl: null,
  role: null,
  city: null,
  state: null,
  country: null,
  currentEmployer: null,
  yearsExperience: null,
};

/**
 * Becoming a mentor, one step at a time.
 *
 * The step lives in the URL (`?step=sessions`) rather than in component state,
 * so the back button works, a step can be linked to from the checklist, and
 * Stripe's hosted onboarding can return the mentor to exactly where they left.
 *
 * Progress is also written to the server (`onboarding_step`), because Stripe's
 * flow leaves the site entirely — a mentor who connects their bank on their
 * phone and comes back on a laptop should not start again.
 */
export function SetupWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [state, setState] = useState<SetupState>({
    mentor: null,
    sessionTypes: [],
    availability: [],
    profile: EMPTY_PROFILE,
    readiness: null,
    paymentsConfigured: true,
    draft: {},
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [starting, setStarting] = useState(false);

  const setDraft = useCallback((patch: SetupDraft) => {
    setState((current) => ({ ...current, draft: { ...current.draft, ...patch } }));
  }, []);

  const reload = useCallback(async () => {
    const res = await fetch("/api/mentorship/me", { cache: "no-store" });
    if (!res.ok) {
      setLoading(false);
      return;
    }
    const json = await res.json();
    setState({
      mentor: json.mentor ?? null,
      sessionTypes: json.sessionTypes ?? [],
      availability: json.availability ?? [],
      profile: json.profile ?? EMPTY_PROFILE,
      readiness: json.readiness ?? null,
      paymentsConfigured: json.paymentsConfigured !== false,
      // Cleared on reload: whatever was pending has now either been saved or
      // discarded, and a stale draft would keep overriding the real values.
      draft: {},
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const save = useCallback(
    async (patch: Record<string, unknown>) => {
      setSaving(true);
      try {
        const res = await fetch("/api/mentorship/me", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
        const json = await res.json();
        if (!res.ok) {
          toast.error(json.message ?? "Could not save");
          return false;
        }
        // Re-read rather than trusting the PUT's echo: readiness and the
        // session list both move as a side effect of what was just saved.
        await reload();
        return true;
      } catch {
        toast.error("Could not save");
        return false;
      } finally {
        setSaving(false);
      }
    },
    [reload],
  );

  const current = stepIndex(searchParams.get("step") ?? "profile");

  const goTo = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(index, SETUP_STEPS.length - 1));
      const params = new URLSearchParams(searchParams.toString());
      params.set("step", SETUP_STEPS[clamped].slug);
      router.push(`/mentorship/setup?${params.toString()}`, { scroll: false });
      // Long steps push the heading off screen; landing mid-form reads as a
      // page that did not change.
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [router, searchParams],
  );

  if (loading) {
    return <p className="text-[var(--mk-muted)]">Loading…</p>;
  }

  // Nobody has started: the pitch, then one button that creates the row.
  if (!state.mentor) {
    return (
      <div className="mx-auto max-w-xl py-8 text-center">
        <h1 className="mk-title">Teach what you know</h1>
        <p className="mt-3 text-[15px] text-[var(--mk-muted)]">
          Chefs and hospitality leaders sell one-to-one sessions on Brigade. You set the
          price and the hours; Brigade handles the booking, the payment and the reminders,
          and keeps 20% of each session.
        </p>
        <ul className="mt-6 space-y-2 text-left text-[15px] text-[var(--mk-muted)]">
          <li>· Takes about ten minutes, and you can stop halfway.</li>
          <li>· Your card is a draft until you publish it.</li>
          <li>· Payouts go to your own Stripe account.</li>
        </ul>
        <Button
          className="mt-6"
          disabled={starting}
          onClick={async () => {
            setStarting(true);
            const ok = await save({
              // The browser's zone is a good first guess; the hours step lets
              // them change it, and shows a warning if the two disagree.
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              status: "draft",
              onboardingStep: 0,
            });
            setStarting(false);
            if (ok) goTo(0);
          }}
        >
          {starting ? "Setting up…" : "Start setting up"}
        </Button>
      </div>
    );
  }

  const StepComponent = STEP_COMPONENTS[SETUP_STEPS[current].slug];
  const stepProps: StepProps = {
    state,
    save,
    reload,
    setDraft,
    saving,
    onNext: () => goTo(current + 1),
  };

  return (
    <div>
      <header className="mb-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="mk-title">
            {state.mentor.status === "active" ? "Your mentoring" : "Set up mentoring"}
          </h1>
          <p className="text-[14px] text-[var(--mk-muted)]">
            {state.mentor.status === "active"
              ? "Live in the directory"
              : state.mentor.status === "paused"
                ? "Paused — not taking new bookings"
                : "Draft — nobody can see this yet"}
          </p>
        </div>

        {state.readiness && (
          <div className="mt-4">
            <div
              className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--mk-wash-strong)]"
              role="progressbar"
              aria-valuenow={state.readiness.percentComplete}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Setup progress"
            >
              <div
                className="h-full rounded-full bg-[var(--mk-ink)] transition-[width] duration-300"
                style={{ width: `${state.readiness.percentComplete}%` }}
              />
            </div>
            <p className="mt-1.5 text-[13px] text-[var(--mk-subtle)]">
              {state.readiness.percentComplete}% set up
            </p>
          </div>
        )}
      </header>

      {/* Step navigation. Every step is reachable — someone who wants to fix
          their price before finishing their bio should not have to click
          through everything in between. */}
      <nav className="mb-8 flex flex-wrap gap-2" aria-label="Setup steps">
        {SETUP_STEPS.map((step, index) => {
          const isCurrent = index === current;
          return (
            <button
              key={step.slug}
              type="button"
              onClick={() => goTo(index)}
              aria-current={isCurrent ? "step" : undefined}
              className={
                isCurrent
                  ? "rounded-full bg-[var(--mk-ink)] px-3.5 py-1.5 text-[13px] font-medium text-[var(--brand-white)]"
                  : "rounded-full px-3.5 py-1.5 text-[13px] text-[var(--mk-text)] shadow-[inset_0_0_0_1px_var(--mk-chip-line)] hover:bg-[var(--mk-wash)]"
              }
            >
              <span className="text-[var(--mk-subtle)]">{index + 1}.</span>{" "}
              <span className={isCurrent ? "text-[var(--brand-white)]" : ""}>{step.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          {StepComponent ? <StepComponent {...stepProps} /> : null}

          <div className="mt-10 flex items-center justify-between border-t border-[var(--mk-line)] pt-5">
            <button
              type="button"
              onClick={() => goTo(current - 1)}
              disabled={current === 0}
              className="text-[14px] text-[var(--mk-muted)] underline underline-offset-4 hover:text-[var(--mk-text)] disabled:opacity-40 disabled:no-underline"
            >
              Back
            </button>
            {current < SETUP_STEPS.length - 1 && (
              <button
                type="button"
                onClick={() => goTo(current + 1)}
                className="text-[14px] text-[var(--mk-muted)] underline underline-offset-4 hover:text-[var(--mk-text)]"
              >
                Skip for now
              </button>
            )}
          </div>
        </div>

        <aside className="lg:sticky lg:top-8 lg:self-start">
          <MentorCardPreview state={state} />
        </aside>
      </div>
    </div>
  );
}
