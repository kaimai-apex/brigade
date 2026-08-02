"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SKILLS } from "@/lib/onboarding/taxonomy";
import type { StepProps } from "./types";

/**
 * The suggestions are the SHARED skills list.
 *
 * A member picking "Food costing" on their own onboarding and a mentor picking
 * it here produce the same string, which is the entire basis of the
 * recommendation ranking. A private list here would look identical and match
 * nothing. Free text is still allowed for anything the list does not name — it
 * simply cannot contribute to a skills match until a member types it too.
 */
const SUGGESTED: readonly string[] = SKILLS;

const MAX_TAGS = 12;

export function StepProfile({ state, save, setDraft, saving, onNext }: StepProps) {
  const mentor = state.mentor;
  const [headline, setHeadline] = useState(mentor?.headline ?? "");
  const [bio, setBio] = useState(mentor?.bio ?? "");
  const [expertise, setExpertise] = useState<string[]>(mentor?.expertise ?? []);
  const [custom, setCustom] = useState("");

  // Computed outside the state updater on purpose: an updater must be pure,
  // and React will call it twice in development to prove that it is.
  function toggle(tag: string) {
    const next = expertise.includes(tag)
      ? expertise.filter((t) => t !== tag)
      : expertise.length >= MAX_TAGS
        ? expertise
        : [...expertise, tag];
    setExpertise(next);
    setDraft({ expertise: next });
  }

  function addCustom() {
    const tag = custom.trim();
    if (!tag) return;
    // Case-insensitive, so "Pastry" and "pastry" do not become two facets.
    if (expertise.some((t) => t.toLowerCase() === tag.toLowerCase())) {
      setCustom("");
      return;
    }
    if (expertise.length >= MAX_TAGS) return;
    const next = [...expertise, tag];
    setExpertise(next);
    setDraft({ expertise: next });
    setCustom("");
  }

  return (
    <form
      className="space-y-6"
      onSubmit={async (event) => {
        event.preventDefault();
        const ok = await save({ headline, bio, expertise, onboardingStep: 1 });
        if (ok) onNext();
      }}
    >
      <div>
        <h2 className="text-[20px] font-semibold text-[var(--mk-text)]">
          How you introduce yourself
        </h2>
        <p className="mt-1 text-[14px] text-[var(--mk-muted)]">
          This is what people read before they decide to book an hour of your time.
        </p>
      </div>

      <label className="block">
        <span className="text-[13px] font-semibold text-[var(--mk-text)]">Headline</span>
        <input
          value={headline}
          onChange={(event) => {
            setHeadline(event.target.value);
            setDraft({ headline: event.target.value });
          }}
          maxLength={120}
          placeholder="Private chef · 15 years · menus and costing"
          className="mt-1 h-12 w-full rounded-lg border border-[var(--mk-line)] px-3 text-base"
        />
        <span className="mt-1 block text-[13px] text-[var(--mk-subtle)]">
          One line. What you do, and for how long. {headline.length}/120
        </span>
      </label>

      <label className="block">
        <span className="text-[13px] font-semibold text-[var(--mk-text)]">What people get</span>
        <textarea
          value={bio}
          onChange={(event) => {
            setBio(event.target.value);
            setDraft({ bio: event.target.value });
          }}
          rows={6}
          maxLength={2000}
          placeholder={
            "Be specific about the problem you solve.\n\n" +
            "“Bring me a menu and I will show you where the margin is hiding. " +
            "I have costed menus for private clients and a 90-cover room, and I will " +
            "walk you through the maths so you can do it yourself next time.”"
          }
          className="mt-1 w-full rounded-lg border border-[var(--mk-line)] p-3 text-base"
        />
        <span className="mt-1 block text-[13px] text-[var(--mk-subtle)]">
          {bio.length}/2000
        </span>
      </label>

      <div>
        <span className="text-[13px] font-semibold text-[var(--mk-text)]">What you teach</span>
        <p className="mt-1 text-[13px] text-[var(--mk-subtle)]">
          Up to {MAX_TAGS}. These are how people find you.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {Array.from(new Set([...SUGGESTED, ...expertise])).map((tag) => {
            const on = expertise.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggle(tag)}
                aria-pressed={on}
                className={
                  on
                    ? "rounded-full bg-[var(--mk-ink)] px-3 py-1.5 text-[13px] text-[var(--brand-white)]"
                    : "rounded-full px-3 py-1.5 text-[13px] text-[var(--mk-text)] shadow-[inset_0_0_0_1px_var(--mk-chip-line)] hover:bg-[var(--mk-wash)]"
                }
              >
                {tag}
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex gap-2">
          <input
            value={custom}
            onChange={(event) => setCustom(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                // Otherwise Enter submits the whole step while the tag is still
                // sitting in the box unadded.
                event.preventDefault();
                addCustom();
              }
            }}
            placeholder="Something else you teach"
            maxLength={40}
            className="h-11 flex-1 rounded-lg border border-[var(--mk-line)] px-3 text-base"
          />
          <Button
            type="button"
            variant="outline"
            onClick={addCustom}
            disabled={!custom.trim() || expertise.length >= MAX_TAGS}
          >
            Add
          </Button>
        </div>
      </div>

      <Button type="submit" disabled={saving || !headline.trim() || !bio.trim()}>
        {saving ? "Saving…" : "Save and continue"}
      </Button>
    </form>
  );
}
