"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
 * answer is saved as it is given, so a closed tab costs nothing.
 */

type Answers = Record<string, unknown>;

export function MenteeFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [answers, setAnswers] = useState<Answers>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const index = stepIndexById(searchParams.get("step"));
  const step = MENTEE_STEPS[index];

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/onboarding", { cache: "no-store" });
      if (res.ok) setAnswers(await res.json());
      setLoading(false);
    })();
  }, []);

  const save = useCallback(async (patch: Answers) => {
    // Optimistic: the input should never wait for a round trip.
    setAnswers((current) => ({ ...current, ...patch }));
    setSaving(true);
    try {
      const res = await fetch("/api/onboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) toast.error("That did not save — check your connection");
    } catch {
      toast.error("That did not save — check your connection");
    } finally {
      setSaving(false);
    }
  }, []);

  const goTo = useCallback(
    (next: number) => {
      if (next >= MENTEE_STEPS.length) {
        router.push("/onboarding/recommendations");
        return;
      }
      const clamped = Math.max(0, next);
      router.push(`/onboarding?step=${MENTEE_STEPS[clamped].id}`, { scroll: false });
      window.scrollTo({ top: 0 });
    },
    [router],
  );

  if (loading) {
    return <p className="text-ink/50">Loading…</p>;
  }

  return (
    <div>
      <ProgressRail step={step} />

      <div className="mt-8">
        <h1 className="font-display text-2xl font-black leading-tight text-ink sm:text-3xl">
          {step.title.replace("{{FirstName}}", String(answers.firstName ?? "there"))}
        </h1>
        {step.subtitle && <p className="mt-2 text-[15px] text-ink/60">{step.subtitle}</p>}
      </div>

      <div className="mt-6">
        <StepBody
          key={step.id}
          step={step}
          answers={answers}
          save={save}
          onAdvance={() => goTo(index + 1)}
        />
      </div>

      <div className="mt-10 flex items-center justify-between border-t border-neutral-100 pt-5">
        <button
          type="button"
          onClick={() => goTo(index - 1)}
          disabled={index === 0}
          className="text-meta text-ink/50 underline underline-offset-4 hover:text-ink disabled:opacity-40 disabled:no-underline"
        >
          Back
        </button>
        <div className="flex items-center gap-4">
          {saving && <span className="text-meta text-ink/40">Saving…</span>}
          {step.optional && (
            <button
              type="button"
              onClick={() => goTo(index + 1)}
              className="text-meta text-ink/50 underline underline-offset-4 hover:text-ink"
            >
              Skip
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ProgressRail({ step }: { step: MenteeStep }) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <p className="text-meta font-semibold text-ink/60">{step.phase}</p>
        <p className="text-meta text-ink/40">{step.percent}%</p>
      </div>
      <div
        className="mt-2 h-1 overflow-hidden rounded-full bg-ink/10"
        role="progressbar"
        aria-valuenow={step.percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Onboarding progress"
      >
        <div
          className="h-full rounded-full bg-forest transition-[width] duration-300"
          style={{ width: `${step.percent}%` }}
        />
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
      return (
        <Button onClick={onAdvance}>{step.cta ?? "Continue"}</Button>
      );

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
  const current = answers[step.field!];
  return (
    <ul className="space-y-2">
      {step.options?.map((option) => {
        const selected = String(current ?? "") === option.value;
        return (
          <li key={option.value}>
            <button
              type="button"
              aria-pressed={selected}
              onClick={async () => {
                // Picking IS the answer, so there is no second click to confirm.
                await save({
                  [step.field!]:
                    step.field === "preferredSessionMinutes"
                      ? Number(option.value)
                      : option.value,
                });
                onAdvance();
              }}
              className={
                selected
                  ? "w-full rounded-xl border border-forest bg-forest/5 px-4 py-3 text-left text-[15px] font-medium text-ink"
                  : "w-full rounded-xl border border-ink/15 px-4 py-3 text-left text-[15px] text-ink hover:border-ink/40 hover:bg-ink/[0.02]"
              }
            >
              {option.label}
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
  function toggle(value: string) {
    setSelected((current) => {
      const next = current.includes(value)
        ? current.filter((entry) => entry !== value)
        : current.length >= max
          ? current
          : [...current, value];
      // Saved on every tap rather than on Continue, so leaving mid-question
      // still keeps the answers. Deferred out of the updater, which must be pure.
      queueMicrotask(() => void save({ [step.field!]: next }));
      return next;
    });
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {step.options?.map((option) => {
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
                  ? "rounded-full bg-forest px-4 py-2 text-[14px] font-medium text-white"
                  : "rounded-full px-4 py-2 text-[14px] text-ink shadow-[inset_0_0_0_1px_rgba(26,26,23,0.18)] hover:bg-ink/[0.03] disabled:opacity-35"
              }
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <p className="text-meta mt-3 text-ink/40">
        {selected.length} of {max} chosen
        {atCap ? " — that is the maximum" : ""}
      </p>

      <Button className="mt-5" onClick={onAdvance} disabled={selected.length === 0 && !step.optional}>
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
        className="w-full rounded-xl border border-ink/15 p-4 text-base"
      />
      <p className="text-meta mt-1 text-ink/40">{value.length}/1000</p>
      <Button
        className="mt-5"
        onClick={async () => {
          await save({ [step.field!]: value });
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

  async function commit() {
    await save(values);
    onAdvance();
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        void commit();
      }}
    >
      {(step.fields ?? []).map((field) => (
        <label key={field.name} className="block">
          <span className="text-meta font-semibold text-ink/70">{field.label}</span>
          {field.type === "timezone" ? (
            <select
              value={values[field.name] || guessTimezone()}
              onChange={(event) =>
                setValues((current) => ({ ...current, [field.name]: event.target.value }))
              }
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
              className="mt-1 h-12 w-full rounded-lg border border-ink/15 px-3 text-base"
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
  return (
    <div>
      <ul className="space-y-2">
        {(step.fields ?? []).map((field: StepField) => {
          const on = Boolean(answers[field.name]);
          return (
            <li key={field.name}>
              <button
                type="button"
                role="switch"
                aria-checked={on}
                onClick={() => void save({ [field.name]: !on })}
                className="flex w-full items-center justify-between rounded-xl border border-ink/15 px-4 py-3 text-left hover:bg-ink/[0.02]"
              >
                <span className="text-[15px] text-ink">{field.label}</span>
                <span
                  aria-hidden
                  className={
                    on
                      ? "h-6 w-10 rounded-full bg-forest p-1"
                      : "h-6 w-10 rounded-full bg-ink/15 p-1"
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
