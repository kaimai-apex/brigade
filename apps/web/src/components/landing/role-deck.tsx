'use client';

import { useEffect, useState } from 'react';

type Role = {
  className: string;
  role: [string, string];
  art: string;
  who: string;
  dot: string;
};

const ROLES: Role[] = [
  {
    className: 'bg-forest text-paper',
    role: ['Chefs', '& sous'],
    art: '/hero/chef-chef.png',
    who: 'Line cooks to executive chefs',
    dot: '#1c4b3d',
  },
  {
    className: 'bg-rust text-paper',
    role: ['Bar', 'program'],
    art: '/hero/chef-bartender.png',
    who: 'Bartenders, barbacks & beverage directors',
    dot: '#c8471f',
  },
  {
    className: 'bg-gold text-ink',
    role: ['Pastry', '& bake'],
    art: '/hero/hero-pastry.png',
    who: 'Pastry chefs, bakers & chocolatiers',
    dot: '#e8b84b',
  },
  {
    className: 'bg-cobalt text-paper',
    role: ['Front', 'of house'],
    art: '/hero/hero-host.png',
    who: "Servers, hosts & maître d's",
    dot: '#2d4a9e',
  },
  {
    className: 'bg-cream text-ink',
    role: ['Somme-', 'liers'],
    art: '/hero/hero-sommelier.png',
    who: 'Somms, wine directors & cicerones',
    dot: '#b7a887',
  },
  {
    className: 'bg-forest text-paper',
    role: ['GMs', '& owners'],
    art: '/hero/hero-manager.png',
    who: 'Managers, operators & owners',
    dot: '#1c4b3d',
  },
];

const MID = (ROLES.length - 1) / 2;
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
      () => setActive((a) => (a + 1) % ROLES.length),
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
        {ROLES.map((r, i) => (
          <article
            key={r.role.join(' ')}
            className={`fan-card ${r.className} ${i === active ? 'is-active' : ''}`}
            style={{ '--i': i, zIndex: i + 1 } as React.CSSProperties}
            onMouseEnter={() => setActive(i)}
          >
            <span className="fan-masthead">Brigade</span>
            <span className="fan-art" aria-hidden>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={r.art} alt="" />
            </span>
            <span className="fan-role">
              {r.role[0]}
              <br />
              <em>{r.role[1]}</em>
            </span>
            <span className="fan-for">{r.who}</span>
          </article>
        ))}
      </div>

      <div className="fan-dots" role="tablist" aria-label="Who Brigade is for">
        {ROLES.map((r, i) => (
          <button
            key={r.role.join(' ')}
            type="button"
            className="fan-dot"
            role="tab"
            aria-selected={i === active}
            aria-label={`${r.role.join(' ').replace('- ', '')} — ${r.who}`}
            data-active={i === active}
            style={{ '--dot': r.dot } as React.CSSProperties}
            onClick={() => select(i)}
          />
        ))}
      </div>
    </div>
  );
}
