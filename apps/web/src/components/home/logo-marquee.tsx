const COMPANIES = [
  'Four Seasons',
  'Marriott',
  'Ritz-Carlton',
  'Nobu',
  'Eleven Madison',
  'Per Se',
  'Alinea',
  'Balthazar',
  'French Laundry',
  'Momofuku',
  'Daniel',
  'Le Bernardin',
] as const;

const WORDMARK_STYLE: Record<string, string> = {
  'Four Seasons': 'font-normal tracking-tight',
  Marriott: 'font-bold tracking-[0.08em] uppercase',
  'Ritz-Carlton': 'font-semibold tracking-tight',
  Nobu: 'font-bold tracking-tight',
  'Eleven Madison': 'font-medium tracking-tight',
  'Per Se': 'font-semibold italic tracking-tight',
  Alinea: 'font-bold tracking-tight',
  Balthazar: 'font-semibold tracking-tight',
  'French Laundry': 'font-medium tracking-tight',
  Momofuku: 'font-bold tracking-tight',
  Daniel: 'font-normal tracking-tight',
  'Le Bernardin': 'font-semibold tracking-tight',
};

/** Dark employer strip under the hero — ADPList marquee rhythm, Brigade houses. */
export function LogoMarquee() {
  const reel = [...COMPANIES, ...COMPANIES];

  return (
    <section aria-label="Kitchens our mentors come from" className="overflow-hidden bg-[var(--mk-ink)] py-6">
      <div className="mk-mask-fade-x flex">
        <div className="mk-animate-marquee flex shrink-0 items-center gap-14 pr-14 md:gap-20 md:pr-20">
          {reel.map((name, i) => (
            <span
              key={`${name}-${i}`}
              aria-hidden={i >= COMPANIES.length}
              className={`whitespace-nowrap text-[19px] text-white/75 md:text-[22px] ${
                WORDMARK_STYLE[name] ?? 'font-medium tracking-tight'
              }`}
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
