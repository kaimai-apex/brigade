import Link from "next/link";
import { SiteHeader } from "@/components/layout/site-header";
import { Button } from "@/components/ui/button";

/**
 * Public landing page served at `/`.
 * Replaces the pre-migration static `legacy-landing.html`; the homepage is now a
 * real React (Next.js App Router) route. The hero (chef illustrations over color
 * blobs) and the "Every seat at the table" tilted card deck are ported faithfully
 * from that original — see the `.hero-art` / `.cover` rules in globals.css.
 */

const STATS = [
  { value: "12k+", label: "hospitality pros" },
  { value: "3,400", label: "kitchens & venues" },
  { value: "48", label: "cities" },
];

const svg = {
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  viewBox: "0 0 24 24",
};

type Cover = {
  className: string;
  role: [string, string];
  stat: string;
  icon: React.ReactNode;
};

const COVERS: Cover[] = [
  {
    className: "bg-forest text-paper",
    role: ["Chefs", "& sous"],
    stat: "Line, sous, executive",
    icon: (
      <svg {...svg}>
        <path d="M7 10.5c0-3.2 1.6-5.5 2.6-5.5.5-1.4 1.7-2 2.4-2s1.9.6 2.4 2c1 0 2.6 2.3 2.6 5.5 0 2-1 3-2 3.3V19H9v-5.2c-1-.3-2-1.3-2-3.3z" />
        <path d="M9 19h6" />
      </svg>
    ),
  },
  {
    className: "bg-rust text-paper",
    role: ["Bar", "program"],
    stat: "Bartenders & barbacks",
    icon: (
      <svg {...svg}>
        <path d="M10 2.5h4v2.8l1.8 1.8V20a1 1 0 0 1-1 1H9.2a1 1 0 0 1-1-1V7.1L10 5.3V2.5z" />
        <path d="M9 11h6" />
      </svg>
    ),
  },
  {
    className: "bg-sage text-ink",
    role: ["Front", "of house"],
    stat: "Managers & hosts",
    icon: (
      <svg {...svg}>
        <path d="M4 16.5a8 8 0 0 1 16 0" />
        <line x1="2" y1="16.5" x2="22" y2="16.5" />
        <line x1="12" y1="16.5" x2="12" y2="19.5" />
      </svg>
    ),
  },
  {
    className: "bg-cobalt text-paper",
    role: ["Sommeliers", "& cellar"],
    stat: "Wine & beverage",
    icon: (
      <svg {...svg}>
        <path d="M7.5 3.5h9c0 5.2-2.2 8.5-4.5 8.5s-4.5-3.3-4.5-8.5z" />
        <line x1="12" y1="12" x2="12" y2="19.5" />
        <line x1="8.5" y1="21" x2="15.5" y2="21" />
      </svg>
    ),
  },
  {
    className: "bg-gold text-ink",
    role: ["General", "managers"],
    stat: "Ops & P&L",
    icon: (
      <svg {...svg}>
        <rect x="6" y="4" width="12" height="17" rx="1.5" />
        <rect x="9" y="2.3" width="6" height="3" rx="1" />
        <line x1="9" y1="10.5" x2="15" y2="10.5" />
        <line x1="9" y1="14.5" x2="15" y2="14.5" />
      </svg>
    ),
  },
  {
    className: "bg-paper text-ink border-2 border-ink",
    role: ["Pastry", "& bake"],
    stat: "Sweet side of the house",
    icon: (
      <svg {...svg}>
        <rect x="4.5" y="12.5" width="15" height="7.5" rx="1" />
        <path d="M4.5 15.5h15" />
        <line x1="12" y1="12.5" x2="12" y2="7.5" />
        <path d="M12 7.5c-1.1 0-1.7-.7-1.7-1.6S10.9 4.3 12 4.3s1.7.6 1.7 1.6S13.1 7.5 12 7.5z" />
      </svg>
    ),
  },
  {
    className: "bg-cobalt text-paper",
    role: ["Servers", "& runners"],
    stat: "Tipped & salaried",
    icon: (
      <svg {...svg}>
        <ellipse cx="12" cy="12" rx="9" ry="3.2" />
        <circle cx="9" cy="10.7" r="1.2" fill="currentColor" stroke="none" />
        <circle cx="15" cy="10.7" r="1.2" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    className: "bg-sage text-ink",
    role: ["Owners", "& operators"],
    stat: "Multi-unit & indie",
    icon: (
      <svg {...svg}>
        <circle cx="8" cy="8" r="4" />
        <line x1="11" y1="11" x2="20" y2="20" />
        <line x1="16.5" y1="15.5" x2="19" y2="13" />
        <line x1="18.5" y1="17.5" x2="21" y2="15" />
      </svg>
    ),
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-cream text-ink">
      <SiteHeader />

      {/* Hero */}
      <header className="relative overflow-hidden">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 lg:grid-cols-2 lg:py-24">
          <div>
            <span className="mb-2 inline-block -rotate-2 font-marker text-3xl text-rust">
              psst — table&rsquo;s ready
            </span>
            <h1 className="font-display text-[clamp(58px,11vw,132px)] font-black leading-[0.86] tracking-tight">
              Find Your
              <br />
              Brigade
              <span className="italic font-semibold text-forest">.</span>
            </h1>
            <p className="mt-9 max-w-lg text-xl font-medium leading-relaxed text-ink/80">
              The professional home for hospitality — where you find community,
              grow your career, and unlock new opportunities.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Button asChild size="lg">
                <Link href="/signup">Join Brigade</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/discover">Discover professionals</Link>
              </Button>
            </div>

            <dl className="mt-12 flex gap-10">
              {STATS.map((s) => (
                <div key={s.label}>
                  <dt className="font-display text-3xl font-black text-ink">
                    {s.value}
                  </dt>
                  <dd className="text-sm text-ink/60">{s.label}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Chef illustrations over color blobs */}
          <div className="hero-art" aria-hidden>
            <span className="art-blob blob-cobalt" />
            <span className="art-blob blob-forest" />
            <span className="art-blob blob-gold" />
            <span className="art-blob blob-rust" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="art-piece art-cutlery" src="/hero/chef-cutlery.jpg" alt="" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="art-piece art-bartender" src="/hero/chef-bartender.jpg" alt="" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="art-piece art-cook" src="/hero/chef-cook.jpg" alt="" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="art-piece art-chef" src="/hero/chef-chef.jpg" alt="" />
          </div>
        </div>
      </header>

      {/* Every seat at the table — the card deck */}
      <section className="mx-auto max-w-[1240px] px-6 py-24">
        <div className="mb-14 max-w-2xl">
          <span className="mb-3.5 block text-[13px] font-extrabold uppercase tracking-[0.14em] text-rust">
            Every seat at the table
          </span>
          <h2 className="font-display text-[clamp(32px,4vw,48px)] font-black leading-[1.05]">
            Build your profile.
            <br />
            Grow your network.
            <br />
            Find opportunities.
            <br />
            Join your Brigade.
          </h2>
        </div>

        <div className="deck-grid">
          {COVERS.map((c) => (
            <div key={c.role.join(" ")} className={`cover ${c.className}`}>
              <span className="masthead">
                Brigade
                <span className="icon">{c.icon}</span>
              </span>
              <div className="role">
                {c.role[0]}
                <br />
                <em>{c.role[1]}</em>
              </div>
              <span className="stat">{c.stat}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Closer */}
      <section className="bg-gold px-6 py-28 text-center text-ink">
        <h2 className="font-display text-[clamp(48px,10vw,120px)] font-black leading-[0.9] tracking-tight">
          Let&rsquo;s
          <br />
          <span className="italic font-semibold">work.</span>
        </h2>
        <p className="mx-auto mt-7 max-w-md text-lg text-ink/80">
          Join the network built for hospitality professionals.
        </p>
        <Button asChild size="lg" className="mt-9">
          <Link href="/signup">Join Brigade</Link>
        </Button>
      </section>

      <footer className="bg-ink text-paper">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-10 text-sm text-paper/60 sm:flex-row">
          <span className="font-display text-xl font-black text-paper">Brigade</span>
          <span>
            &copy; {new Date().getFullYear()} Brigade — Hospitality Talent Network
          </span>
        </div>
      </footer>
    </div>
  );
}
