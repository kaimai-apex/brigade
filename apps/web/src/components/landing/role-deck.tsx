'use client';

import { useEffect, useState } from 'react';

type ValueCard = {
  className: string;
  title: [string, string];
  art: string;
  blurb: string;
  dot: string;
};

// Value-first cards: say what you'll DO here, not who you are. The hero
// answers "is this for me?"; these answer "what can I actually do?".
const CARDS: ValueCard[] = [
  {
    className: 'bg-forest text-paper',
    title: ['Build Your', 'Network'],
    art: '/hero/hero-host.png',
    blurb: 'Connect with trusted hospitality professionals.',
    dot: '#1c4b3d',
  },
  {
    className: 'bg-rust text-paper',
    title: ['Learn', 'Together'],
    art: '/hero/chef-chef.png',
    blurb: 'Share knowledge, advice, and industry insights.',
    dot: '#c8471f',
  },
  {
    className: 'bg-gold text-ink',
    title: ['Discover', 'Opportunities'],
    art: '/hero/hero-manager.png',
    blurb: 'Find jobs, collaborations, and referrals.',
    dot: '#e8b84b',
  },
  {
    className: 'bg-cobalt text-paper',
    title: ['Build Your', 'Brigade'],
    art: '/hero/chef-cook.png',
    blurb: "Create trusted teams you'll work with again.",
    dot: '#2d4a9e',
  },
];

const MID = (CARDS.length - 1) / 2;
const INTERVAL = 1500;

export function RoleDeck() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [kick, setKick] = useState(0);

  useEffect(() => {
    if (paused) return;
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }
    const id = setInterval(
      () => setActive((a) => (a + 1) % CARDS.length),
      INTERVAL,
    );
    return () => clearInterval(id);
  }, [paused, kick]);

  const select = (i: number) => {
    setActive(i);
    setKick((k) => k + 1); // restart the countdown so the picked card lingers
  };

  return (
    <div
      className="role-deck"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="fan" style={{ '--mid': MID } as React.CSSProperties}>
        {CARDS.map((c, i) => (
          <article
            key={c.title.join(' ')}
            className={`fan-card ${c.className} ${i === active ? 'is-active' : ''}`}
            style={{ '--i': i, zIndex: i + 1 } as React.CSSProperties}
            onMouseEnter={() => setActive(i)}
          >
            <span className="fan-masthead">Brigade</span>
            <span className="fan-art" aria-hidden>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.art} alt="" />
            </span>
            <span className="fan-role">
              {c.title[0]}
              <br />
              <em>{c.title[1]}</em>
            </span>
            <span className="fan-for">{c.blurb}</span>
          </article>
        ))}
      </div>

      <div className="fan-dots" role="tablist" aria-label="What you can do on Brigade">
        {CARDS.map((c, i) => (
          <button
            key={c.title.join(' ')}
            type="button"
            className="fan-dot"
            role="tab"
            aria-selected={i === active}
            aria-label={`${c.title.join(' ')} — ${c.blurb}`}
            data-active={i === active}
            style={{ '--dot': c.dot } as React.CSSProperties}
            onClick={() => select(i)}
          />
        ))}
      </div>
    </div>
  );
}
