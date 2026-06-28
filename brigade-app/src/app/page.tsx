import Link from "next/link";
import { getLiveChefs } from "@/lib/store";
import { BEACHHEAD } from "@/lib/seed";
import { slugify } from "@/lib/seo";
import { ChefCard } from "@/components/ui";
import { WaitlistForm } from "@/components/WaitlistForm";

export const dynamic = "force-dynamic";

export default async function Home() {
  const chefs = await getLiveChefs();
  const featured = chefs.filter((c) => c.city === BEACHHEAD).slice(0, 3);
  const cuisinesInBeachhead = Array.from(
    new Set(chefs.filter((c) => c.city === BEACHHEAD).flatMap((c) => c.cuisines)),
  ).slice(0, 6);

  return (
    <div>
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pt-20 pb-14 text-center">
        <div className="flex items-center justify-center gap-3 mb-6">
          <span className="hidden sm:block h-px w-12 bg-brass-bright/60" />
          <p className="eyebrow">Private Chefs · Now in {BEACHHEAD}</p>
          <span className="hidden sm:block h-px w-12 bg-brass-bright/60" />
        </div>
        <h1 className="text-5xl sm:text-6xl font-medium tracking-tight max-w-3xl mx-auto text-forest">
          Where private chefs build their reputation, run their business, and get
          found.
        </h1>
        <p className="text-xl text-stone-600 mt-6 max-w-2xl mx-auto">
          The LinkedIn and the back-office for the private hospitality world. A
          verified profile, the tools to run your bookings, and a network that
          sends you work — and you keep 100% of what you earn.
        </p>
        <div className="flex flex-wrap gap-3 justify-center mt-9">
          <Link href="/signup" className="btn btn-primary">
            Join as a chef
          </Link>
          <Link href="/chefs" className="btn btn-outline">
            Find a chef
          </Link>
        </div>
      </section>

      {/* Featured chefs (beachhead density) */}
      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Private chefs in {BEACHHEAD}
            </h2>
            <p className="text-stone-600">
              Vetted, reviewed, and bookable directly.
            </p>
          </div>
          <Link href={`/private-chef/${slugify(BEACHHEAD)}`} className="text-copper hover:underline shrink-0">
            See all →
          </Link>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((c, i) => (
            <ChefCard key={c.id} chef={c} priority={i === 0} />
          ))}
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          {cuisinesInBeachhead.map((cz) => (
            <Link
              key={cz}
              href={`/private-chef/${slugify(BEACHHEAD)}/${slugify(cz)}`}
              className="text-sm rounded-full border border-stone-300 px-3 py-1 hover:border-copper hover:text-copper"
            >
              {cz} chefs in {BEACHHEAD}
            </Link>
          ))}
        </div>
      </section>

      {/* Two halves */}
      <section className="bg-paper border-y border-stone-200">
        <div className="mx-auto max-w-6xl px-4 py-14 grid md:grid-cols-2 gap-8">
          <div>
            <h3 className="eyebrow">The credibility layer</h3>
            <p className="font-display text-2xl mt-2 text-forest">
              A profile you&apos;re proud to send.
            </p>
            <p className="text-stone-600 mt-2">
              Verified, beautiful, and discoverable on Google. Send your own leads
              to it — every off-platform client you point here discovers the
              directory, which sends more work back to you.
            </p>
          </div>
          <div>
            <h3 className="eyebrow">The tools layer</h3>
            <p className="font-display text-2xl mt-2 text-forest">
              Run your whole business in one place.
            </p>
            <p className="text-stone-600 mt-2">
              Inquiry inbox, availability calendar, quotes, invoicing and a client
              CRM — instead of Instagram DMs, your notes app, and a spreadsheet.
            </p>
          </div>
        </div>
      </section>

      {/* Why it doesn't leak */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="text-2xl font-bold tracking-tight text-center">
          We never take a cut of the meal.
        </h2>
        <p className="text-stone-600 text-center mt-2 max-w-2xl mx-auto">
          Booking marketplaces die because both sides cut them out to dodge
          commission. Brigade charges for presence and tools, not the
          transaction — so nobody has a reason to route around us.
        </p>
        <div className="grid sm:grid-cols-3 gap-5 mt-8">
          {[
            ["Keep 100%", "No commission on your dinners — ever. You bill your client directly."],
            ["Own your reputation", "Profile, reviews, and history are yours. Switching away means losing your workflow, not your leads."],
            ["Get discovered", "Programmatic SEO ranks your city and cuisine, sending you inbound work you didn't have to hustle for."],
          ].map(([t, b]) => (
            <div key={t} className="rounded-xl border border-stone-200 bg-paper p-5">
              <p className="font-semibold">{t}</p>
              <p className="text-sm text-stone-600 mt-1">{b}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Dual waitlist */}
      <section className="bg-forest text-cream">
        <div className="mx-auto max-w-6xl px-4 py-14 grid md:grid-cols-2 gap-10">
          <div>
            <h2 className="text-2xl font-bold">Chefs — claim your spot</h2>
            <p className="text-stone-300 mt-2 mb-4">
              Founding chefs in {BEACHHEAD} get Pro free and a hand-built profile.
            </p>
            <div className="bg-cream text-ink rounded-2xl p-5">
              <WaitlistForm role="chef" cta="Claim my founding spot" />
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-bold">Hiring? Get early access</h2>
            <p className="text-stone-300 mt-2 mb-4">
              Estate managers, family offices and agencies — find and vet private
              chefs yourself, without paying an agency thousands.
            </p>
            <div className="bg-cream text-ink rounded-2xl p-5">
              <WaitlistForm role="buyer" cta="Request buyer access" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
