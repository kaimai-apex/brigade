"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
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
function Chips({
  options,
  selected,
  onToggle,
  max,
}: {
  options: readonly string[];
  selected: string[];
  onToggle: (value: string) => void;
  max: number;
}) {
  const atCap = selected.length >= max;
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {options.map((option) => {
        const on = selected.includes(option);
        return (
          <button
            key={option}
            type="button"
            aria-pressed={on}
            disabled={!on && atCap}
            onClick={() => onToggle(option)}
            className={
              on
                ? "rounded-full bg-[var(--mk-ink)] px-3 py-1.5 text-[13px] text-[var(--brand-white)]"
                : "rounded-full px-3 py-1.5 text-[13px] text-[var(--mk-text)] shadow-[inset_0_0_0_1px_var(--mk-chip-line)] hover:bg-[var(--mk-wash)] disabled:opacity-35"
            }
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

export function StepAudience({ state, save, saving, onNext }: StepProps) {
  const mentor = state.mentor;
  const [menteeTypes, setMenteeTypes] = useState<string[]>(mentor?.menteeTypes ?? []);
  const [helpOffered, setHelpOffered] = useState<string[]>(mentor?.helpOffered ?? []);
  const [industries, setIndustries] = useState<string[]>(mentor?.industries ?? []);
  const [languages, setLanguages] = useState<string[]>(mentor?.languages ?? []);

  const toggle = (
    current: string[],
    setter: (next: string[]) => void,
    max: number,
  ) => (value: string) => {
    const next = current.includes(value)
      ? current.filter((entry) => entry !== value)
      : current.length >= max
        ? current
        : [...current, value];
    setter(next);
  };

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

      <div>
        <span className="text-[13px] font-semibold text-[var(--mk-text)]">
          Who do you most want in front of you?
        </span>
        <Chips
          options={MENTEE_TYPES}
          selected={menteeTypes}
          onToggle={toggle(menteeTypes, setMenteeTypes, 4)}
          max={4}
        />
        <p className="mt-2 text-[13px] text-[var(--mk-subtle)]">
          &ldquo;Anyone who asks&rdquo; is a perfectly good answer — it just ranks a little lower
          than naming a group, because someone who named it is a closer fit.
        </p>
      </div>

      <div>
        <span className="text-[13px] font-semibold text-[var(--mk-text)]">
          What kind of help can you give?
        </span>
        <Chips
          options={HELP_TYPES}
          selected={helpOffered}
          onToggle={toggle(helpOffered, setHelpOffered, 6)}
          max={6}
        />
        <p className="mt-2 text-[13px] text-[var(--mk-subtle)]">
          The shape of the session, rather than the subject. You can know menus inside out and
          still not want to run mock interviews.
        </p>
      </div>

      <div>
        <span className="text-[13px] font-semibold text-[var(--mk-text)]">
          Where have you cooked privately?
        </span>
        <Chips
          options={INDUSTRIES}
          selected={industries}
          onToggle={toggle(industries, setIndustries, 6)}
          max={6}
        />
      </div>

      <div>
        <span className="text-[13px] font-semibold text-[var(--mk-text)]">
          What languages can you hold a session in?
        </span>
        <Chips
          options={COMMON_LANGUAGES}
          selected={languages}
          onToggle={toggle(languages, setLanguages, 6)}
          max={6}
        />
      </div>

      <Button type="submit" disabled={saving}>
        {saving ? "Saving…" : "Save and continue"}
      </Button>
    </form>
  );
}
