'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { RoleDeck } from '@/components/landing/role-deck';

/**
 * ADPList hero chrome (odometer, serif H1, expertise search) over the
 * Brigade role-deck cards instead of a stock photo.
 */
export function HomeHero({
  minutesShared,
  mentorCount,
}: {
  minutesShared: number;
  mentorCount: number;
}) {
  return (
    <section className="relative flex min-h-[860px] flex-col items-center overflow-hidden bg-[var(--brand-paper-warm,#F7F2EA)] pb-16 pt-[108px] lg:min-h-[92vh]">
      {/* Color blobs — same atmosphere as the original Brigade hero art */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <span className="art-blob blob-cobalt opacity-90" />
        <span className="art-blob blob-forest opacity-90" />
        <span className="art-blob blob-gold opacity-90" />
        <span className="art-blob blob-rust opacity-90" />
      </div>

      <div className="relative z-10 w-full max-w-[900px] px-5 text-center">
        <Odometer value={minutesShared} />

        <h1 className="mk-serif-display mt-8 text-balance text-[var(--brand-ink,#1A1A17)]">
          The fastest way to get unstuck in hospitality
        </h1>

        <p className="mx-auto mt-6 max-w-[640px] text-[17px] leading-relaxed text-[var(--brand-ink-muted,#4A4A45)] md:text-[19px]">
          Meet a chef who already made the move you want to make.{' '}
          {Math.max(mentorCount, 1).toLocaleString('en-US')}+ mentors. Real kitchens.
          Book a 1:1 session.
        </p>

        <HeroSearch />
      </div>

      {/* Brigade hero cards — the visual that used to own the landing */}
      <div className="relative z-10 mt-10 w-full max-w-[640px] px-4 lg:mt-12">
        <RoleDeck />
      </div>
    </section>
  );
}

function Odometer({ value }: { value: number }) {
  const chars = value.toLocaleString('en-US').split('');

  return (
    <div className="inline-flex items-center gap-3 rounded-full bg-[var(--brand-ink,#1A1A17)]/90 px-4 py-2 text-[14px] text-white/90 backdrop-blur-sm">
      <span>Knowledge shared</span>
      <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 font-medium tabular-nums">
        <span className="inline-flex">
          {chars.map((c, i) =>
            c === ',' ? (
              <span key={i} className="px-px">
                ,
              </span>
            ) : (
              <DigitReel key={i} digit={Number(c)} />
            ),
          )}
        </span>
        <span>minutes</span>
      </span>
    </div>
  );
}

function DigitReel({ digit }: { digit: number }) {
  return (
    <span className="relative inline-block h-5 w-2.5 overflow-hidden align-middle">
      <span className="sr-only">{digit}</span>
      <span
        aria-hidden
        className="absolute left-0 top-0 flex flex-col transition-transform duration-700 ease-out"
        style={{ transform: `translateY(-${digit * 20}px)` }}
      >
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <span key={n} className="flex h-5 items-center justify-center leading-none">
            {n}
          </span>
        ))}
      </span>
    </span>
  );
}

function HeroSearch() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const input = useRef<HTMLInputElement>(null);

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        router.push(q.trim() ? `/mentors?q=${encodeURIComponent(q.trim())}` : '/mentors');
      }}
      className="mx-auto mt-10 flex w-full max-w-[720px] items-center gap-3 rounded-full border border-black/8 bg-white p-2.5 pl-6 shadow-[0_16px_48px_rgba(16,24,40,0.12)]"
    >
      <label
        className="min-w-0 flex-1 cursor-text text-left"
        onClick={() => input.current?.focus()}
      >
        <span className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--mk-text)]">
          Expertise
        </span>
        <input
          ref={input}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="What do you want to get better at?"
          aria-label="What do you want to get better at?"
          className="mt-0.5 w-full border-0 bg-transparent p-0 text-[16px] text-[var(--mk-text)] outline-none placeholder:text-[var(--mk-subtle)]"
        />
      </label>
      <button
        type="submit"
        aria-label="Search mentors"
        className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[var(--mk-ink)] text-white transition hover:scale-105"
      >
        <Search className="size-5" />
      </button>
    </form>
  );
}
