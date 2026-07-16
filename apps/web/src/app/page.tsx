import Link from "next/link";
import { SiteHeader } from "@/components/layout/site-header";
import { Button } from "@/components/ui/button";

/**
 * Public landing page — networking-first hospitality community.
 * No stats, no public directory. Hero + Manifesto + Why We Exist + CTA.
 */

const MANIFESTO = [
  "Hospitality is built on people.",
  "Great teams are built through relationships.",
  "Careers grow through community.",
  "Brigade exists to help professionals build meaningful connections.",
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-ink">
      <SiteHeader />

      {/* Hero */}
      <header className="relative overflow-hidden">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-10 sm:gap-12 sm:px-6 sm:py-16 lg:grid-cols-2 lg:py-24">
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
            <p className="mt-6 max-w-lg text-base font-medium leading-relaxed text-ink/80 sm:mt-9 sm:text-xl">
              A hospitality community for building relationships, growing your career,
              and collaborating with people you trust — your Brigade.
            </p>
            <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
              <Button asChild size="lg" className="w-full sm:w-auto">
                <Link href="/signup">Join Brigade</Link>
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
            <img className="art-piece art-cutlery" src="/hero/chef-cutlery.jpg" alt="" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="art-piece art-bartender" src="/hero/chef-bartender.jpg" alt="" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="art-piece art-cook max-md:hidden" src="/hero/chef-cook.jpg" alt="" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="art-piece art-chef max-md:hidden" src="/hero/chef-chef.jpg" alt="" />
          </div>
        </div>
      </header>

      {/* Our Manifesto */}
      <section className="border-y border-neutral-100 bg-neutral-50 px-6 py-24">
        <div className="mx-auto max-w-3xl">
          <span className="mb-3.5 block text-eyebrow text-rust">
            Our Manifesto
          </span>
          <h2 className="font-display text-[clamp(32px,4vw,48px)] font-black leading-[1.05]">
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
      </section>

      {/* Why We Exist */}
      <section className="mx-auto max-w-3xl px-6 py-24">
        <span className="mb-3.5 block text-eyebrow text-rust">
          Why We Exist
        </span>
        <h2 className="font-display text-[clamp(32px,4vw,48px)] font-black leading-[1.05]">
          Hospitality runs on people who know each other.
        </h2>
        <div className="mt-8 space-y-5 text-lg leading-relaxed text-ink/80">
          <p>
            Our mission is to give hospitality professionals a home for community — a place
            to stay close with the chefs, bartenders, managers, and operators who shape your
            career.
          </p>
          <p>
            We focus on networking and collaboration: share what&apos;s happening on the floor,
            invite people into your Brigade, and grow through relationships — not hiring funnels.
          </p>
          <p>
            When the industry is connected, teams get stronger, careers move faster, and the
            work gets better. That&apos;s the impact we&apos;re here for.
          </p>
        </div>
      </section>

      {/* Community CTA */}
      <section className="bg-gold px-6 py-28 text-center text-ink">
        <h2 className="font-display text-[clamp(40px,8vw,96px)] font-black leading-[0.9] tracking-tight">
          Build your
          <br />
          <span className="italic font-semibold">Brigade.</span>
        </h2>
        <p className="mx-auto mt-7 max-w-md text-lg text-ink/80">
          Join the community built for hospitality professionals.
        </p>
        <div className="mt-9 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center sm:gap-4">
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link href="/signup">Join Brigade</Link>
          </Button>
          <Button asChild variant="link" size="lg">
            <Link href="/login">Log in</Link>
          </Button>
        </div>
      </section>

      <footer className="bg-ink text-paper">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-10 text-sm text-paper/60 sm:flex-row">
          <span className="font-display text-xl font-black text-paper">Brigade</span>
          <span>
            &copy; {new Date().getFullYear()} Brigade — Hospitality Community
          </span>
        </div>
      </footer>
    </div>
  );
}
