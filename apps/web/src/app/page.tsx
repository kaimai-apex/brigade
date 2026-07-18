import Link from "next/link";
import { Button } from "@/components/ui/button";
import { RoleDeck } from "@/components/landing/role-deck";

/**
 * Public landing — full-screen, waitlist-first. A single hero: "Find Your
 * Brigade." on the left, and an auto-cycling fanned deck of role cards on the
 * right that pop up to show who Brigade is for. Product app stays behind login.
 */

export default function LandingPage() {
  return (
    <main className="brigade-landing">
      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between gap-4 px-5 py-5 sm:px-8">
        <Link
          href="/"
          className="font-display text-2xl font-black tracking-tight text-ink"
        >
          Brigade
        </Link>
        <nav className="flex items-center gap-2 sm:gap-3">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="rounded-full px-4 text-ink hover:bg-ink/5 hover:text-ink"
          >
            <Link href="/login">Log in</Link>
          </Button>
          <Button
            asChild
            variant="gold"
            size="sm"
            className="rounded-full px-4"
          >
            <Link href="/waitlist">Join Waitlist</Link>
          </Button>
        </nav>
      </div>

      {/* Hero */}
      <div className="relative z-10 flex flex-1 items-center">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-5 pb-10 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,560px)] lg:gap-8">
          {/* Left — headline */}
          <div className="text-center lg:text-left">
            <span className="mb-3 inline-block -rotate-2 font-marker text-2xl text-rust sm:text-3xl">
              psst — table&rsquo;s ready
            </span>
            <h1 className="font-display text-[clamp(52px,13vw,120px)] font-black leading-[0.88] tracking-tight text-ink">
              Find Your
              <br />
              Brigade
              <span className="italic font-semibold text-forest">.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-md text-lg text-ink/70 lg:mx-0">
              The professional network built for everyone with a seat at the
              table. Every one of them is your people.
            </p>
            <div className="mt-8 flex items-center justify-center gap-5 lg:justify-start">
              <Button
                asChild
                variant="gold"
                size="lg"
                className="rounded-full px-8"
              >
                <Link href="/waitlist">
                  Join Waitlist <span aria-hidden>→</span>
                </Link>
              </Button>
              <Link
                href="/login"
                className="text-base font-medium text-ink hover:text-forest"
              >
                Log in
              </Link>
            </div>
          </div>

          {/* Right — auto-cycling fanned role deck */}
          <RoleDeck />
        </div>
      </div>

      {/* Footer strip */}
      <div className="relative z-10 flex items-center justify-center gap-2 px-5 pb-5 text-xs text-ink/45">
        <span>&copy; {new Date().getFullYear()} Brigade</span>
        <span aria-hidden>·</span>
        <span>Every seat at the table.</span>
      </div>
    </main>
  );
}
