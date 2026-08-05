"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { MultiSelect } from "@/components/ui/multi-select";
import {
  COMMON_LANGUAGES,
  HELP_TYPES,
  INDUSTRIES,
  MENTEE_TYPES,
} from "@/lib/onboarding/taxonomy";
import type { StepProps } from "./types";

/**
 * Who this mentor is for.
 *
 * Every list here is the other half of a question a member answers during their
 * own onboarding — `helpOffered` pairs with their `helpWanted`, `industries`
 * with their `interestIndustries`, `menteeTypes` with the stage they said they
 * are at. That pairing is what the recommendation ranking runs on; a mentor who
 * skips this step is still listed and still browsable, but has given the
 * matcher nothing to work with and will lose to one who answered.
 *
 * The skills question is deliberately NOT here. It lives on the profile step as
 * "what you teach", because it doubles as the mentor's directory tags.
 */
/**
 * One question, one menu.
 *
 * These four lists run from six entries to fourteen. Laid out as chips they put
 * forty words on the screen at once and the step reads as a wall — which is
 * exactly the step a mentor skips, and a mentor who skips it gives the matcher
 * nothing. Collapsed, each question is a sentence and a control.
 */
function Question({
  label,
  hint,
  options,
  selected,
  onChange,
  max,
}: {
  label: string;
  hint?: string;
  options: readonly string[];
  selected: string[];
  onChange: (next: string[]) => void;
  max: number;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="text-[13px] font-semibold text-[var(--mk-text)]">
        {label}
      </label>
      <div className="mt-2">
        <MultiSelect
          id={id}
          values={selected}
          onChange={onChange}
          options={options.map((option) => ({ value: option, label: option }))}
          max={max}
          className="border-[var(--mk-line)]"
        />
      </div>
      {hint && <p className="mt-2 text-[13px] text-[var(--mk-subtle)]">{hint}</p>}
    </div>
  );
}

export function StepAudience({ state, save, saving, onNext }: StepProps) {
  const mentor = state.mentor;
  const [menteeTypes, setMenteeTypes] = useState<string[]>(mentor?.menteeTypes ?? []);
  const [helpOffered, setHelpOffered] = useState<string[]>(mentor?.helpOffered ?? []);
  const [industries, setIndustries] = useState<string[]>(mentor?.industries ?? []);
  const [languages, setLanguages] = useState<string[]>(mentor?.languages ?? []);

  return (
    <form
      className="space-y-8"
      onSubmit={async (event) => {
        event.preventDefault();
        const ok = await save({
          menteeTypes,
          helpOffered,
          industries,
          languages,
          onboardingStep: 2,
        });
        if (ok) onNext();
      }}
    >
      <div>
        <h2 className="text-[20px] font-semibold text-[var(--mk-text)]">Who you want to help</h2>
        <p className="mt-1 text-[14px] text-[var(--mk-muted)]">
          Members answer these same questions when they join. Matching them up is how you get
          suggested to the right people instead of everyone.
        </p>
      </div>

      <Question
        label="Who do you most want in front of you?"
        hint={
          "“Anyone who asks” is a perfectly good answer — it just ranks a little lower than " +
          "naming a group, because someone who named it is a closer fit."
        }
        options={MENTEE_TYPES}
        selected={menteeTypes}
        onChange={setMenteeTypes}
        max={4}
      />

      <Question
        label="What kind of help can you give?"
        hint={
          "The shape of the session, rather than the subject. You can know menus inside out " +
          "and still not want to run mock interviews."
        }
        options={HELP_TYPES}
        selected={helpOffered}
        onChange={setHelpOffered}
        max={6}
      />

      <Question
        label="Where have you cooked privately?"
        options={INDUSTRIES}
        selected={industries}
        onChange={setIndustries}
        max={6}
      />

      <Question
        label="What languages can you hold a session in?"
        options={COMMON_LANGUAGES}
        selected={languages}
        onChange={setLanguages}
        max={6}
      />

      <Button type="submit" disabled={saving}>
        {saving ? "Saving…" : "Save and continue"}
      </Button>
    </form>
  );
}
