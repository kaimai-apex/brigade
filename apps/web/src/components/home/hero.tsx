'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { RoleDeck } from '@/components/landing/role-deck';
import { Select } from '@/components/ui/select';
import { SKILLS } from '@/lib/onboarding/taxonomy';

const SKILL_OPTIONS = SKILLS.map((skill) => ({ value: skill, label: skill }));

/**
 * Landing hero — pick a skill from the same list mentors teach, then land on
 * mentors who tagged that skill. No free-text theatre, no invented counts.
 */
export function HomeHero() {
  return (
    <section className="relative flex flex-col items-center overflow-hidden bg-[var(--brand-paper-warm)] pb-14 pt-[100px] md:pb-16 md:pt-[108px] lg:min-h-[88vh]">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <span className="art-blob blob-cobalt opacity-90" />
        <span className="art-blob blob-forest opacity-90" />
        <span className="art-blob blob-gold opacity-90" />
        <span className="art-blob blob-rust opacity-90" />
      </div>

      <div className="relative z-10 w-full max-w-[900px] px-5 text-center">
        <h1 className="mk-serif-display text-balance text-[var(--brand-ink)]">
          The fastest way to get unstuck in hospitality
        </h1>

        <p className="mx-auto mt-5 max-w-[36ch] text-[17px] leading-relaxed text-[var(--brand-ink-muted)] md:mt-6 md:max-w-[640px] md:text-[19px]">
          Meet a private chef who already made the move you want to make. Book a
          1:1 session and leave with a plan.
        </p>

        <HeroExpertisePicker />
      </div>

      <div className="relative z-10 mt-10 w-full max-w-[640px] px-4 lg:mt-12">
        <RoleDeck />
      </div>
    </section>
  );
}

function HeroExpertisePicker() {
  const router = useRouter();
  const [skill, setSkill] = useState('');

  function go(next: string) {
    if (!next) {
      router.push('/mentors');
      return;
    }
    router.push(`/mentors?expertise=${encodeURIComponent(next)}`);
  }

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        go(skill);
      }}
      className="mx-auto mt-8 flex w-full max-w-[720px] flex-col gap-3 rounded-[28px] border border-black/8 bg-[var(--mk-surface)] p-3 shadow-[0_16px_48px_rgba(16,24,40,0.12)] sm:mt-10 sm:flex-row sm:items-end sm:gap-2 sm:rounded-full sm:p-2.5 sm:pl-6"
    >
      <label className="min-w-0 flex-1 text-left sm:px-1">
        <span className="block px-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--mk-muted)] sm:px-0">
          Find a mentor within
        </span>
        <Select
          value={skill}
          onValueChange={(value) => {
            setSkill(value);
            // One tap is enough — don't make them also hit the button.
            go(value);
          }}
          options={SKILL_OPTIONS}
          placeholder="Choose what you want to get better at"
          aria-label="Find a mentor within"
          className="mt-0.5 h-11 border-0 bg-transparent px-1 text-[16px] shadow-none hover:border-0 focus-visible:ring-0 focus-visible:ring-offset-0 sm:px-0"
        />
      </label>
      <button
        type="submit"
        className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-[var(--mk-ink)] px-5 text-[15px] font-semibold text-[var(--brand-white)] transition hover:scale-[1.02] sm:w-auto"
      >
        {skill ? 'Find mentors' : 'Browse mentors'}
        <ArrowRight className="size-4" aria-hidden />
      </button>
    </form>
  );
}
