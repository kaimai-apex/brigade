'use client';

import { useEffect, useState } from 'react';

type ValueCard = {
  className: string;
  title: [string, string];
  art: string;
  blurb: string;
  dot: string;
  href?: string;
};

// Value-first cards for private-chef mentorship — what you can actually do here.
const CARDS: ValueCard[] = [
  {
    className: 'bg-forest text-paper',
    title: ['Find a', 'Mentor'],
    art: '/hero/hero-host.png',
    blurb: 'Private chefs who already made the move.',
    dot: 'var(--brand-forest)',
  },
  {
    className: 'bg-rust text-paper',
    title: ['Book a', 'Session'],
    art: '/hero/chef-chef.png',
    blurb: '1:1 time. Leave with a plan, not advice.',
    dot: 'var(--brand-rust)',
  },
  {
    className: 'bg-gold text-ink',
    title: ['Free', 'Resources'],
    art: '/hero/hero-manager.png',
    blurb: 'We help you with free guides, tips, and playbooks.',
    dot: 'var(--brand-gold)',
    href: '#free-resources',
  },
  {
    className: 'bg-cobalt text-paper',
    title: ['Teach', 'What You Know'],
    art: '/hero/chef-cook.png',
    blurb: 'Set your price. Brigade handles the rest.',
    dot: 'var(--brand-cobalt)',
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
    setKick((k) => k + 1);
  };

  return (
    <div
      className="role-deck"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="fan" style={{ '--mid': MID } as React.CSSProperties}>
        {CARDS.map((c, i) => {
          const body = (
            <>
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
            </>
          );
          const className = `fan-card ${c.className} ${i === active ? 'is-active' : ''}`;
          const style = { '--i': i, zIndex: i + 1 } as React.CSSProperties;
          if (c.href) {
            return (
              <a
                key={c.title.join(' ')}
                href={c.href}
                className={className}
                style={style}
                onMouseEnter={() => setActive(i)}
                tabIndex={i === active ? 0 : -1}
                aria-hidden={i !== active}
              >
                {body}
              </a>
            );
          }
          return (
            <article
              key={c.title.join(' ')}
              className={className}
              style={style}
              onMouseEnter={() => setActive(i)}
              aria-hidden={i !== active}
            >
              {body}
            </article>
          );
        })}
      </div>

      <div className="fan-dots" role="group" aria-label="What you can do on Brigade">
        {CARDS.map((c, i) => (
          <button
            key={c.title.join(' ')}
            type="button"
            className="fan-dot"
            aria-current={i === active ? 'true' : undefined}
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
