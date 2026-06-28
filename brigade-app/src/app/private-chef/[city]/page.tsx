import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLiveChefs } from "@/lib/store";
import { CUISINES } from "@/lib/seed";
import { cityFromSlug, indexableCities, slugify } from "@/lib/seo";
import { ChefCard } from "@/components/ui";

// Programmatic SEO: one page per city that has live supply (docs/07).
export async function generateStaticParams() {
  const chefs = await getLiveChefs();
  return indexableCities(chefs).map((city) => ({ city: slugify(city) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ city: string }>;
}): Promise<Metadata> {
  const { city: citySlug } = await params;
  const city = cityFromSlug(citySlug);
  if (!city) return {};
  return {
    title: `Private chefs in ${city}`,
    description: `Hire a verified private chef in ${city} for dinner parties, celebrations and events. Browse menus and reviews, contact chefs directly — no agency fees.`,
    alternates: { canonical: `/private-chef/${citySlug}` },
  };
}

export default async function CityPage({
  params,
}: {
  params: Promise<{ city: string }>;
}) {
  const { city: citySlug } = await params;
  const city = cityFromSlug(citySlug);
  if (!city) notFound();

  const chefs = (await getLiveChefs()).filter((c) => c.city === city);
  if (chefs.length === 0) notFound(); // never emit a thin page

  const cuisinesHere = CUISINES.filter((cz) =>
    chefs.some((c) => c.cuisines.includes(cz)),
  );

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Private chefs in ${city}`,
    numberOfItems: chefs.length,
    itemListElement: chefs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `https://brigade.example/c/${c.slug}`,
      name: c.name,
    })),
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav className="text-sm text-stone-500 mb-3">
        <Link href="/chefs" className="hover:text-ink">Directory</Link> ·{" "}
        <span>Private chefs in {city}</span>
      </nav>
      <h1 className="text-3xl font-bold tracking-tight">
        Private chefs in {city}
      </h1>
      <p className="text-stone-600 mt-2 max-w-2xl">
        {chefs.length} verified private chefs serving {city}, available for dinner
        parties, celebrations and private events. Every chef is vetted, reviewed,
        and bookable directly — you hire them, we don&apos;t take a cut of the meal.
      </p>

      {cuisinesHere.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2">
          {cuisinesHere.map((cz) => (
            <Link
              key={cz}
              href={`/private-chef/${citySlug}/${slugify(cz)}`}
              className="text-sm rounded-full border border-stone-300 px-3 py-1 hover:border-copper hover:text-copper"
            >
              {cz} chefs in {city}
            </Link>
          ))}
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 mt-8">
        {chefs.map((c) => (
          <ChefCard key={c.id} chef={c} />
        ))}
      </div>

      <section className="mt-12 prose-stone max-w-2xl text-stone-700 space-y-3">
        <h2 className="text-xl font-semibold text-ink">
          How much does a private chef cost in {city}?
        </h2>
        <p className="text-sm leading-relaxed">
          Private chef pricing in {city} typically ranges from around £55–£185 per
          guest depending on the number of courses, sourcing, and the chef&apos;s
          experience. Most chefs on Brigade quote per event after a short
          conversation about your menu, guest count and dietary needs. Send an
          inquiry to any chef above for a tailored quote.
        </p>
      </section>
    </div>
  );
}
