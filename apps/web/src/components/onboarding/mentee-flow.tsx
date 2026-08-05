"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { MultiSelect } from "@/components/ui/multi-select";
import { Select } from "@/components/ui/select";
import { controlFor } from "@/lib/onboarding/disclosure";
import {
  isPhaseBoundary,
  milestoneMessage,
  phaseOutline,
  progressPercent,
  questionsRemaining,
  remainingSeconds,
  resumeIndex,
  timeRemainingLabel,
} from "@/lib/onboarding/progress";
import { playCue } from "@/lib/onboarding/sound";
import {
  MENTEE_STEPS,
  stepIndexById,
  type MenteeStep,
  type StepField,
} from "@/lib/onboarding/mentee-steps";

/**
 * The member onboarding flow.
 *
 * One component for every step, driven by the definitions in mentee-steps.ts.
 * The step lives in the URL so back works and a step can be linked to; every
 * answer is saved as it is given, so a closed tab costs nothing — and coming
 * back lands on the first unanswered question rather than the welcome screen.
 *
 * One question fills the screen, and past a handful of options that question's
 * answers sit behind a menu (`controlFor`). Someone joining should be reading a
 * sentence and answering it, not auditing forty words to find the two that
 * describe them.
 *
 * Every answer moves the bar, makes a small sound and animates the screen it
 * came from. None of that is decoration: fifteen questions is a long corridor,
 * and the only honest reason to walk down it is that each step visibly does
 * something. What is refused is the other half of that trick — there is no
 * artificial pause anywhere, no fake "personalising" beat, and no praise for
 * answering a question that did not deserve any.
 */

type Answers = Record<string, unknown>;

const TOTAL = MENTEE_STEPS.length;

export function MenteeFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [answers, setAnswers] = useState<Answers>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [milestone, setMilestone] = useState<string | null>(null);

  const index = stepIndexById(searchParams.get("step"));
  const step = MENTEE_STEPS[index];

  /**
   * Resume, but only on arrival.
   *
   * A step in the URL is a deliberate destination — a back button, a link from
   * the recommendations screen — and overriding it would make the flow feel
   * like it was fighting the browser. Only a bare `/onboarding` gets moved.
   */
  const resumed = useRef(false);
  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/onboarding", { cache: "no-store" });
      const saved: Answers = res.ok ? await res.json() : {};
      setAnswers(saved);
      setLoading(false);

      if (resumed.current) return;
      resumed.current = true;
      if (searchParams.get("step")) return;

      const target = resumeIndex(MENTEE_STEPS, saved);
      if (target > 0) {
        router.replace(`/onboarding?step=${MENTEE_STEPS[target].id}`, { scroll: false });
      }
    })();
    // Deliberately once: this is the load, not a subscription to the URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Saves that have been sent and not yet answered.
   *
   * Kept because exactly one thing in the flow genuinely has to wait for them:
   * leaving it. The recommendations screen re-reads the profile from the
   * database, so pushing to it while the last answer is still in flight can
   * rank against a profile that does not include it yet. Everything else — and
   * in particular moving between questions — must not wait for anything.
   */
  const inFlight = useRef(new Set<Promise<unknown>>());

  const save = useCallback((patch: Answers): Promise<void> => {
    // Optimistic: the input should never wait for a round trip.
    setAnswers((current) => ({ ...current, ...patch }));
    setSaving(true);

    const request = (async () => {
      try {
        const res = await fetch("/api/onboarding", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
        if (!res.ok) toast.error("That did not save — check your connection");
      } catch {
        toast.error("That did not save — check your connection");
      }
    })();

    inFlight.current.add(request);
    // Bookkeeping attached after the promise exists rather than in its own
    // `finally`, which would be referring to itself before it was assigned.
    void request.finally(() => {
      inFlight.current.delete(request);
      // Only when the last one lands: two overlapping saves would otherwise
      // clear the indicator while one of them was still out.
      if (inFlight.current.size === 0) setSaving(false);
    });

    return request;
  }, []);

  const goTo = useCallback(
    (next: number) => {
      if (next > index) {
        // A section ending is the one thing worth marking. Marking every answer
        // would spend the same praise fifteen times and be worth nothing by the
        // third; this happens about five times in the whole flow.
        if (isPhaseBoundary(MENTEE_STEPS, index)) {
          setMilestone(milestoneMessage(MENTEE_STEPS[index].phase));
          playCue("milestone");
        } else {
          playCue("advance");
        }
      } else if (next < index) {
        playCue("back");
      }

      setDirection(next < index ? "back" : "forward");

      if (next >= TOTAL) {
        // The one place a round trip is worth waiting for — see `inFlight`.
        // allSettled, not all: a save that failed has already said so, and
        // stranding someone on the last question because of it would be worse.
        void Promise.allSettled([...inFlight.current]).then(() =>
          router.push("/onboarding/recommendations"),
        );
        return;
      }
      const clamped = Math.max(0, next);
      router.push(`/onboarding?step=${MENTEE_STEPS[clamped].id}`, { scroll: false });
      window.scrollTo({ top: 0 });
    },
    [index, router],
  );

  // The milestone clears itself. Its animation is 2.2s and it is purely
  // additive — the next question is answerable underneath it the whole time.
  useEffect(() => {
    if (!milestone) return;
    const timer = window.setTimeout(() => setMilestone(null), 2300);
    return () => window.clearTimeout(timer);
  }, [milestone]);

  if (loading) {
    return <FlowSkeleton />;
  }

  return (
    <div>
      <ProgressRail index={index} milestone={milestone} />

      <div key={step.id} className="ob-step" data-direction={direction}>
        <div className="ob-stagger mt-8">
          <h1
            className="font-display text-2xl font-black leading-tight text-ink sm:text-3xl"
            style={{ "--ob-i": 0 } as React.CSSProperties}
          >
            {step.title.replace("{{FirstName}}", String(answers.firstName ?? "there"))}
          </h1>
          {step.subtitle && (
            <p
              className="mt-2 text-[15px] text-ink/60"
              style={{ "--ob-i": 1 } as React.CSSProperties}
            >
              {step.subtitle}
            </p>
          )}
        </div>

        <div className="ob-stagger mt-6" style={{ "--ob-i": 2 } as React.CSSProperties}>
          <StepBody
            step={step}
            answers={answers}
            save={save}
            onAdvance={() => goTo(index + 1)}
          />
        </div>
      </div>

      <div className="mt-10 flex items-center justify-between border-t border-neutral-100 pt-5">
        <button
          type="button"
          onClick={() => goTo(index - 1)}
          disabled={index === 0}
          className="text-meta text-ink/65 underline underline-offset-4 hover:text-ink disabled:opacity-40 disabled:no-underline"
        >
          Back
        </button>
        <div className="flex items-center gap-4">
          {saving && <span className="text-meta text-ink/65">Saving…</span>}
          {step.optional && (
            <button
              type="button"
              onClick={() => goTo(index + 1)}
              className="text-meta text-ink/65 underline underline-offset-4 hover:text-ink"
            >
              Skip
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * The shape of the screen, while the answers are on their way.
 *
 * A spinner on the first screen of an account is an unexplained wait; a page
 * that is already the right shape is a page that is nearly there. Costs one
 * component and removes the layout jump when the real thing lands.
 */
function FlowSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading your answers">
      <div className="h-3 w-28 rounded bg-ink/[0.07]" />
      <div className="mt-2 h-1 rounded-full bg-ink/[0.07]" />
      <div className="mt-9 h-7 w-3/4 rounded bg-ink/[0.07]" />
      <div className="mt-3 h-4 w-1/2 rounded bg-ink/[0.05]" />
      <div className="mt-7 space-y-2">
        <div className="h-12 rounded-xl bg-ink/[0.05]" />
        <div className="h-12 rounded-xl bg-ink/[0.05]" />
        <div className="h-12 rounded-xl bg-ink/[0.05]" />
      </div>
    </div>
  );
}

function ProgressRail({ index, milestone }: { index: number; milestone: string | null }) {
  const percent = progressPercent(index, TOTAL);
  const left = timeRemainingLabel(remainingSeconds(MENTEE_STEPS, index));
  const remaining = questionsRemaining(MENTEE_STEPS, index);

  /**
   * The sweep fires only when the bar actually grew.
   *
   * Running it on every render would put a shine on the bar when someone goes
   * backwards, which would be congratulating them for undoing something.
   */
  const [sweeping, setSweeping] = useState(false);
  const previous = useRef(percent);
  useEffect(() => {
    if (percent <= previous.current) {
      previous.current = percent;
      return;
    }
    previous.current = percent;
    setSweeping(true);
    const timer = window.setTimeout(() => setSweeping(false), 640);
    return () => window.clearTimeout(timer);
  }, [percent]);

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-meta font-semibold text-ink/60">{MENTEE_STEPS[index].phase}</p>
        {/* The count and the estimate, not a bare percentage. "6 questions
            left" is something a person can decide about; "35%" is not. */}
        <p className="text-meta text-ink/65">
          {remaining > 0 ? `${remaining} left · ${left}` : left}
        </p>
      </div>

      <div
        className="relative mt-2 h-1.5 overflow-hidden rounded-full bg-ink/10"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Onboarding progress"
      >
        <div
          className={`ob-progress-fill relative h-full rounded-full bg-forest ${
            sweeping ? "ob-progress-sweep" : ""
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* Additive: it appears over the rail and leaves on its own. Nothing
          waits for it, and it never covers the question. */}
      <div className="h-5" aria-live="polite">
        {milestone && (
          <p className="ob-milestone text-meta mt-1.5 inline-flex items-center gap-1.5 font-semibold text-forest">
            <CheckIcon className="size-3.5" aria-hidden />
            {milestone}
          </p>
        )}
      </div>
    </div>
  );
}

function StepBody({
  step,
  answers,
  save,
  onAdvance,
}: {
  step: MenteeStep;
  answers: Answers;
  save: (patch: Answers) => Promise<void>;
  onAdvance: () => void;
}) {
  switch (step.kind) {
    case "welcome":
      return <Welcome step={step} onAdvance={onAdvance} />;

    case "single":
      return <SingleChoice step={step} answers={answers} save={save} onAdvance={onAdvance} />;

    case "multi":
      return <MultiChoice step={step} answers={answers} save={save} onAdvance={onAdvance} />;

    case "text":
      return <LongText step={step} answers={answers} save={save} onAdvance={onAdvance} />;

    case "fields":
      return <ShortFields step={step} answers={answers} save={save} onAdvance={onAdvance} />;

    case "toggles":
      return <Toggles step={step} answers={answers} save={save} onAdvance={onAdvance} />;
  }
}

/**
 * Keys that answer the question in front of you.
 *
 * Nothing here is required to complete the flow and nothing is only available
 * by keyboard — Tab and Enter already reach every control. This is the faster
 * path for the people who look for one, and the digit hints are only drawn on
 * pointer-and-keyboard screens where they are true.
 */
function useAnswerKeys(handler: (key: string) => boolean) {
  const latest = useRef(handler);
  latest.current = handler;

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      // An open Radix menu owns the keyboard: typeahead, arrows and Enter all
      // belong to it, and stealing "3" from a search box is a real bug.
      if (document.querySelector("[data-radix-popper-content-wrapper]")) return;

      // `instanceof Element` rather than a cast: a keydown's target is not
      // always an element — dispatched on `window` it is the window, which has
      // no `closest`, and the TypeError that follows kills a listener that is
      // attached for the whole flow.
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
      // A focused button already handles Enter and Space itself; handling it
      // here too would fire the action twice.
      if (event.key === "Enter" && target?.closest("button, a")) return;

      if (latest.current(event.key)) event.preventDefault();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}

/** The digit that answers an option, or null past the tenth. */
function digitFor(position: number): string | null {
  return position < 9 ? String(position + 1) : null;
}

function KeyHint({ digit }: { digit: string | null }) {
  if (!digit) return null;
  return (
    <span
      aria-hidden
      // Pointer-only devices have no keyboard to press, so the hint is drawn
      // only where it is actionable.
      className="ml-3 hidden size-5 shrink-0 items-center justify-center rounded border border-ink/15 text-[11px] font-semibold text-ink/65 [@media(hover:hover)]:flex"
    >
      {digit}
    </span>
  );
}

/**
 * The first screen: what is about to be asked, and how long it takes.
 *
 * The single biggest thing that makes a long form feel short is knowing its
 * shape before starting it. Four named sections and a real estimate is the
 * whole trick — and both are derived from the steps themselves, so neither can
 * drift into being a comforting lie.
 */
function Welcome({ step, onAdvance }: { step: MenteeStep; onAdvance: () => void }) {
  const outline = useMemo(() => phaseOutline(MENTEE_STEPS), []);
  const estimate = timeRemainingLabel(remainingSeconds(MENTEE_STEPS, 0));

  useAnswerKeys((key) => {
    if (key !== "Enter") return false;
    onAdvance();
    return true;
  });

  return (
    <div>
      {/* Two columns where there is room. Six full-width rows pushed the only
          button on the screen below the fold, which is a strange thing to do
          to a screen whose entire job is to get someone to press it. */}
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {outline.map((section, position) => (
          <li
            key={section.phase}
            className="ob-chip-in flex items-center justify-between gap-2 rounded-xl border border-ink/10 bg-ink/[0.015] px-3.5 py-2.5"
            style={{ animationDelay: `${position * 45}ms` }}
          >
            <span className="text-[15px] text-ink">{section.phase}</span>
            {/* The unit stays. "About you · 4" makes someone work out what
                four refers to, which is the opposite of the point. */}
            <span className="text-meta shrink-0 text-ink/65">
              {section.questions} question{section.questions === 1 ? "" : "s"}
            </span>
          </li>
        ))}
      </ul>

      <p className="text-meta mt-4 text-ink/65">
        {estimate.replace(" left", "")} in total. Skip anything you would rather not answer —
        you can change all of it later.
      </p>

      <Button className="ob-cta-ready mt-6" onClick={onAdvance}>
        {step.cta ?? "Continue"}
      </Button>
    </div>
  );
}

function SingleChoice({
  step,
  answers,
  save,
  onAdvance,
}: {
  step: MenteeStep;
  answers: Answers;
  save: (patch: Answers) => Promise<void>;
  onAdvance: () => void;
}) {
  const current = String(answers[step.field!] ?? "");
  const options = step.options ?? [];

  const store = (value: string) =>
    save({
      [step.field!]: step.field === "preferredSessionMinutes" ? Number(value) : value,
    });

  const collapsed = controlFor(step) === "dropdown";

  const answer = useCallback(
    (value: string) => {
      // Picking IS the answer, so there is no second click to confirm. The
      // cue for that is the forward one, played by `goTo`.
      //
      // Not awaited. This used to hold the screen until the PATCH came back,
      // which meant a tap did nothing visible for as long as the round trip
      // took — the exact dead-tap feeling that optimistic saving exists to
      // prevent, and worst on the connection where it matters most. The save
      // has already updated the answers in memory and reports its own failure.
      void store(value);
      onAdvance();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [step.field, onAdvance],
  );

  useAnswerKeys((key) => {
    if (collapsed) {
      if (key === "Enter" && (current || step.optional)) {
        onAdvance();
        return true;
      }
      return false;
    }
    const position = Number(key) - 1;
    const option = Number.isInteger(position) ? options[position] : undefined;
    if (!option) return false;
    void answer(option.value);
    return true;
  });

  if (collapsed) {
    return (
      <div>
        <Select
          value={current}
          onValueChange={(value) => {
            playCue("select");
            void store(value);
          }}
          options={options}
          placeholder="Choose one"
          aria-label={step.title}
        />
        {/*
          A menu closing and the page changing underneath it is disorienting in
          a way that a tapped list item is not, so a dropdown answer is
          confirmed rather than auto-advanced.
        */}
        <Button
          key={current || "empty"}
          className={`mt-5 ${current ? "ob-cta-ready" : ""}`}
          onClick={onAdvance}
          disabled={!current && !step.optional}
        >
          Continue
        </Button>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {options.map((option, position) => {
        const selected = current === option.value;
        return (
          <li key={option.value}>
            <button
              type="button"
              aria-pressed={selected}
              onClick={() => void answer(option.value)}
              className={
                selected
                  ? "ob-option flex w-full items-center rounded-xl border border-forest bg-forest/5 px-4 py-3 text-left text-[15px] font-medium text-ink"
                  : "ob-option flex w-full items-center rounded-xl border border-ink/15 px-4 py-3 text-left text-[15px] text-ink hover:border-ink/40 hover:bg-ink/[0.02]"
              }
            >
              <span className="min-w-0 flex-1">{option.label}</span>
              {selected ? (
                <CheckIcon className="ml-3 size-4 shrink-0 text-forest" aria-hidden />
              ) : (
                <KeyHint digit={digitFor(position)} />
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function MultiChoice({
  step,
  answers,
  save,
  onAdvance,
}: {
  step: MenteeStep;
  answers: Answers;
  save: (patch: Answers) => Promise<void>;
  onAdvance: () => void;
}) {
  const stored = useMemo(() => {
    const value = answers[step.field!];
    return Array.isArray(value) ? (value as string[]) : [];
  }, [answers, step.field]);

  const [selected, setSelected] = useState<string[]>(stored);
  const options = step.options ?? [];
  const max = step.max ?? 99;
  const atCap = selected.length >= max;

  /**
   * Derived from the previous state, not from the render's closure.
   *
   * Two taps inside one React batch both read the same stale `selected` if this
   * is computed outside the updater, so the second silently discards the first.
   * That is easy to miss by hand and obvious when tapping quickly, which is how
   * people actually answer a chip list.
   */
  const toggle = useCallback(
    (value: string) => {
      setSelected((current) => {
        if (current.includes(value)) {
          const next = current.filter((entry) => entry !== value);
          playCue("deselect");
          queueMicrotask(() => void save({ [step.field!]: next }));
          return next;
        }
        if (current.length >= max) {
          // The cap is stated on screen, and refusing silently would look like
          // a dropped tap. This is the sound of "that is the eighth".
          playCue("blocked");
          return current;
        }
        const next = [...current, value];
        playCue("select");
        // Saved on every tap rather than on Continue, so leaving mid-question
        // still keeps the answers. Deferred out of the updater, which must be pure.
        queueMicrotask(() => void save({ [step.field!]: next }));
        return next;
      });
    },
    [max, save, step.field],
  );

  const collapsed = controlFor(step) === "dropdown";
  const ready = selected.length > 0 || step.optional;

  useAnswerKeys((key) => {
    if (key === "Enter") {
      if (!ready) return false;
      onAdvance();
      return true;
    }
    if (collapsed) return false;
    const position = Number(key) - 1;
    const option = Number.isInteger(position) ? options[position] : undefined;
    if (!option) return false;
    toggle(option.value);
    return true;
  });

  if (collapsed) {
    return (
      <div>
        <MultiSelect
          values={selected}
          onChange={(next) => {
            playCue(next.length > selected.length ? "select" : "deselect");
            setSelected(next);
            void save({ [step.field!]: next });
          }}
          options={options}
          max={step.max}
          placeholder="Choose any that apply"
          aria-label={step.title}
        />
        <Button
          key={selected.length > 0 ? "ready" : "empty"}
          className={`mt-5 ${selected.length > 0 ? "ob-cta-ready" : ""}`}
          onClick={onAdvance}
          disabled={!ready}
        >
          Continue
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {options.map((option, position) => {
          const on = selected.includes(option.value);
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(option.value)}
              disabled={!on && atCap}
              className={
                on
                  ? "ob-option inline-flex items-center rounded-full bg-forest px-4 py-2 text-[14px] font-medium text-white"
                  : "ob-option inline-flex items-center rounded-full px-4 py-2 text-[14px] text-ink shadow-[inset_0_0_0_1px_rgba(26,26,23,0.18)] hover:bg-ink/[0.03] disabled:opacity-35"
              }
            >
              {option.label}
              {on && <CheckIcon className="ml-1.5 size-3.5" aria-hidden />}
              {!on && !atCap && <KeyHint digit={digitFor(position)} />}
            </button>
          );
        })}
      </div>

      <p className="text-meta mt-3 text-ink/65">
        {selected.length} of {max} chosen
        {atCap ? " — that is the maximum" : ""}
      </p>

      <Button
        key={selected.length > 0 ? "ready" : "empty"}
        className={`mt-5 ${selected.length > 0 ? "ob-cta-ready" : ""}`}
        onClick={onAdvance}
        disabled={!ready}
      >
        Continue
      </Button>
    </div>
  );
}

function LongText({
  step,
  answers,
  save,
  onAdvance,
}: {
  step: MenteeStep;
  answers: Answers;
  save: (patch: Answers) => Promise<void>;
  onAdvance: () => void;
}) {
  const [value, setValue] = useState(String(answers[step.field!] ?? ""));

  return (
    <div>
      <textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        // Saved on blur rather than per keystroke: a request per character
        // would be pointless traffic, and Continue saves too.
        onBlur={() => void save({ [step.field!]: value })}
        rows={6}
        maxLength={1000}
        placeholder="Tell us what is holding you back…"
        className="w-full rounded-xl border border-ink/15 p-4 text-base focus-visible:border-ink/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2"
      />
      <p className="text-meta mt-1 text-ink/65">{value.length}/1000</p>
      <Button
        className="mt-5"
        onClick={() => {
          // Sent, not awaited — see `answer` in SingleChoice.
          void save({ [step.field!]: value });
          onAdvance();
        }}
      >
        Continue
      </Button>
    </div>
  );
}

function ShortFields({
  step,
  answers,
  save,
  onAdvance,
}: {
  step: MenteeStep;
  answers: Answers;
  save: (patch: Answers) => Promise<void>;
  onAdvance: () => void;
}) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      (step.fields ?? []).map((field) => [field.name, String(answers[field.name] ?? "")]),
    ),
  );

  const zones = useMemo(timezoneOptions, []);

  function commit() {
    // Sent, not awaited — see `answer` in SingleChoice.
    void save(values);
    onAdvance();
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        commit();
      }}
    >
      {(step.fields ?? []).map((field, position) => (
        <label key={field.name} className="block">
          <span className="text-meta font-semibold text-ink/70">{field.label}</span>
          {field.type === "timezone" ? (
            <select
              value={values[field.name] || guessTimezone()}
              onChange={(event) =>
                setValues((current) => ({ ...current, [field.name]: event.target.value }))
              }
              onBlur={(event) => void save({ [field.name]: event.target.value })}
              className="mt-1 h-12 w-full rounded-lg border border-ink/15 px-3 text-base"
            >
              {zones.map((zone) => (
                <option key={zone} value={zone}>
                  {zone.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          ) : (
            <input
              value={values[field.name] ?? ""}
              onChange={(event) =>
                setValues((current) => ({ ...current, [field.name]: event.target.value }))
              }
              onBlur={() => void save({ [field.name]: values[field.name] ?? "" })}
              type={field.type === "url" ? "url" : "text"}
              placeholder={field.placeholder}
              maxLength={200}
              // The first field of the question takes focus, so someone can
              // start typing the moment the screen settles.
              autoFocus={position === 0}
              className="mt-1 h-12 w-full rounded-lg border border-ink/15 px-3 text-base focus-visible:border-ink/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2"
            />
          )}
        </label>
      ))}

      <Button type="submit">Continue</Button>
    </form>
  );
}

function Toggles({
  step,
  answers,
  save,
  onAdvance,
}: {
  step: MenteeStep;
  answers: Answers;
  save: (patch: Answers) => Promise<void>;
  onAdvance: () => void;
}) {
  const fields = step.fields ?? [];

  useAnswerKeys((key) => {
    if (key === "Enter") {
      onAdvance();
      return true;
    }
    const position = Number(key) - 1;
    const field = Number.isInteger(position) ? fields[position] : undefined;
    if (!field) return false;
    const on = Boolean(answers[field.name]);
    playCue(on ? "deselect" : "select");
    void save({ [field.name]: !on });
    return true;
  });

  return (
    <div>
      <ul className="space-y-2">
        {fields.map((field: StepField, position) => {
          const on = Boolean(answers[field.name]);
          return (
            <li key={field.name}>
              <button
                type="button"
                role="switch"
                aria-checked={on}
                data-selected={on}
                onClick={() => {
                  playCue(on ? "deselect" : "select");
                  void save({ [field.name]: !on });
                }}
                className={
                  on
                    ? "ob-option flex w-full items-center justify-between rounded-xl border border-forest bg-forest/5 px-4 py-3 text-left"
                    : "ob-option flex w-full items-center justify-between rounded-xl border border-ink/15 px-4 py-3 text-left hover:border-ink/40 hover:bg-ink/[0.02]"
                }
              >
                <span className="flex min-w-0 flex-1 items-center">
                  <span className="text-[15px] text-ink">{field.label}</span>
                  {!on && <KeyHint digit={digitFor(position)} />}
                </span>
                <span
                  aria-hidden
                  className={
                    on
                      ? "ml-3 h-6 w-10 shrink-0 rounded-full bg-forest p-1 transition-colors"
                      : "ml-3 h-6 w-10 shrink-0 rounded-full bg-ink/15 p-1 transition-colors"
                  }
                >
                  <span
                    className={
                      on
                        ? "block h-4 w-4 translate-x-4 rounded-full bg-white transition-transform"
                        : "block h-4 w-4 rounded-full bg-white transition-transform"
                    }
                  />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <Button className="mt-5" onClick={onAdvance}>
        Continue
      </Button>
    </div>
  );
}

function guessTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}

/**
 * Every zone the runtime knows, rather than a bundled list that goes stale
 * whenever a country changes its rules.
 */
function timezoneOptions(): string[] {
  try {
    const supported = Intl.supportedValuesOf?.("timeZone");
    if (supported?.length) return supported;
  } catch {
    // Older runtime — fall through.
  }
  return [guessTimezone(), "UTC"];
}
