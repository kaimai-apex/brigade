import Link from "next/link";
import { SiteHeader } from "@/components/layout/site-header";
import { Button } from "@/components/ui/button";

/**
 * Public landing — waitlist-first. Product app stays behind login until launch.
 */

const MANIFESTO = [
  "Hospitality is built on people.",
  "Great teams are built through relationships.",
  "Careers grow through community.",
  "Brigade exists to help professionals build meaningful connections.",
];

type Cover = {
  className: string;
  role: [string, string];
  art: string;
};

const COVERS: Cover[] = [
  {
    className: "bg-forest text-paper",
    role: ["Chefs", "& sous"],
    art: "/hero/chef-chef.png",
  },
  {
    className: "bg-rust text-paper",
    role: ["Bar", "program"],
    art: "/hero/chef-bartender.png",
  },
  {
    className: "bg-sage text-ink",
    role: ["Front", "of house"],
    art: "/hero/hero-host.png",
  },
  {
    className: "bg-cobalt text-paper",
    role: ["Sommeliers", "& cellar"],
    art: "/hero/hero-sommelier.png",
  },
  {
    className: "bg-gold text-ink",
    role: ["General", "managers"],
    art: "/hero/hero-manager.png",
  },
  {
    className: "bg-paper text-ink border-2 border-ink",
    role: ["Pastry", "& bake"],
    art: "/hero/hero-pastry.png",
  },
  {
    className: "bg-cobalt text-paper",
    role: ["Servers", "& runners"],
    art: "/hero/hero-server.png",
  },
  {
    className: "bg-sage text-ink",
    role: ["Owners", "& operators"],
    art: "/hero/chef-cook.png",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-clip bg-white text-ink">
      <SiteHeader />

      {/* Hero */}
      <header className="relative overflow-hidden">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-8 sm:gap-12 sm:px-6 sm:py-16 lg:grid-cols-2 lg:py-24">
          <div>
            <span className="mb-2 inline-block -rotate-2 font-marker text-2xl text-rust sm:text-3xl">
              psst — table&rsquo;s ready
            </span>
            <h1 className="font-display text-[clamp(48px,12vw,64px)] font-black leading-[0.9] tracking-tight md:text-[clamp(58px,11vw,132px)] md:leading-[0.86]">
              Find Your
              <br />
              Brigade
              <span className="italic font-semibold text-forest">.</span>
            </h1>
            <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
              <Button asChild variant="gold" size="lg" className="w-full sm:w-auto">
                <Link href="/waitlist">Join Waitlist</Link>
              </Button>
              <Button asChild variant="link" size="lg" className="w-full sm:w-auto">
                <Link href="/login">Log in</Link>
              </Button>
            </div>
          </div>

          <div className="hero-art max-h-[100dvh] overflow-hidden" aria-hidden>
            <span className="art-blob blob-cobalt" />
            <span className="art-blob blob-forest" />
            <span className="art-blob blob-gold" />
            <span className="art-blob blob-rust" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="art-piece art-cutlery" src="/hero/chef-cutlery.png" alt="" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="art-piece art-bartender" src="/hero/chef-bartender.png" alt="" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="art-piece art-cook max-md:hidden" src="/hero/chef-cook.png" alt="" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="art-piece art-chef max-md:hidden" src="/hero/chef-chef.png" alt="" />
          </div>
        </div>
      </header>

      {/* Every seat at the table — the card deck */}
      <section className="mx-auto max-w-[1240px] overflow-x-clip px-4 py-16 sm:px-6 sm:py-24">
        <div className="mb-10 max-w-2xl sm:mb-14">
          <h2 className="font-display text-[clamp(28px,8vw,48px)] font-black leading-[1.05]">
            Build your profile.
            <br />
            Grow your Brigade.
            <br />
            Find your people.
            <br />
            Join the community.
          </h2>
        </div>

        <div className="deck-grid">
          {COVERS.map((c) => (
            <div key={c.role.join(" ")} className={`cover ${c.className}`}>
              <span className="masthead">Brigade</span>
              <div className="cover-art" aria-hidden>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.art} alt="" />
              </div>
              <div className="role">
                {c.role[0]}
                <br />
                <em>{c.role[1]}</em>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Our Manifesto */}
      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_11rem] lg:gap-10">
          <div className="max-w-3xl">
            <h2 className="font-display text-[clamp(28px,8vw,48px)] font-black leading-[1.05]">
              Built for relationships, not recruiting.
            </h2>
            <ul className="mt-10 space-y-5">
              {MANIFESTO.map((line) => (
                <li
                  key={line}
                  className="border-l-4 border-forest pl-5 text-lg font-medium leading-relaxed text-ink/85"
                >
                  {line}
                </li>
              ))}
            </ul>
          </div>
          <div className="relative mx-auto mt-2 w-36 sm:w-40 lg:mt-10" aria-hidden>
            <span className="absolute left-1/2 top-1/2 size-28 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold/40" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/hero/hero-pastry.png"
              alt=""
              className="relative z-[1] w-full"
            />
          </div>
        </div>
      </section>

      {/* Join Brigade CTA */}
      <section className="bg-gold px-4 py-20 text-center text-ink sm:px-6 sm:py-28">
        <div className="mx-auto max-w-xl">
          <h2 className="font-display text-[clamp(40px,12vw,96px)] font-black leading-[0.9] tracking-tight">
            Join
            <br />
            <span className="italic font-semibold">Brigade.</span>
          </h2>
          <div className="mx-auto mt-8 sm:mt-9">
            <Button
              asChild
              variant="gold"
              size="lg"
              className="w-full max-w-sm border-2 border-ink sm:w-auto"
            >
              <Link href="/waitlist">Join Waitlist</Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="bg-ink text-paper">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-10 text-sm text-paper/60 sm:flex-row">
          <span className="font-display text-xl font-black text-paper">Brigade</span>
          <span>&copy; {new Date().getFullYear()} Brigade</span>
        </div>
      </footer>
    </div>
  );
}
