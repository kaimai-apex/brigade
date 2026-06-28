import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLiveChefs } from "@/lib/store";
import {
  cityFromSlug,
  cuisineFromSlug,
  indexableCityCuisine,
  slugify,
} from "@/lib/seo";
import { ChefCard } from "@/components/ui";

// Programmatic SEO: [cuisine] private chef in [city] — only where supply exists.
export async function generateStaticParams() {
  const chefs = await getLiveChefs();
  return indexableCityCuisine(chefs).map(({ city, cuisine }) => ({
    city: slugify(city),
    cuisine: slugify(cuisine),
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ city: string; cuisine: string }>;
}): Promise<Metadata> {
  const { city: citySlug, cuisine: cuisineSlug } = await params;
  const city = cityFromSlug(citySlug);
  const cuisine = cuisineFromSlug(cuisineSlug);
  if (!city || !cuisine) return {};
  return {
    title: `${cuisine} private chefs in ${city}`,
    description: `Hire a ${cuisine} private chef in ${city}. Browse verified chefs, sample menus and reviews, and contact them directly with no agency fees.`,
    alternates: { canonical: `/private-chef/${citySlug}/${cuisineSlug}` },
  };
}

export default async function CityCuisinePage({
  params,
}: {
  params: Promise<{ city: string; cuisine: string }>;
}) {
  const { city: citySlug, cuisine: cuisineSlug } = await params;
  const city = cityFromSlug(citySlug);
  const cuisine = cuisineFromSlug(cuisineSlug);
  if (!city || !cuisine) notFound();

  const chefs = (await getLiveChefs()).filter(
    (c) => c.city === city && c.cuisines.includes(cuisine),
  );
  if (chefs.length === 0) notFound();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <nav className="text-sm text-stone-500 mb-3">
        <Link href="/chefs" className="hover:text-ink">Directory</Link> ·{" "}
        <Link href={`/private-chef/${citySlug}`} className="hover:text-ink">
          {city}
        </Link>{" "}
        · <span>{cuisine}</span>
      </nav>
      <h1 className="text-3xl font-bold tracking-tight">
        {cuisine} private chefs in {city}
      </h1>
      <p className="text-stone-600 mt-2 max-w-2xl">
        {chefs.length} verified {cuisine.toLowerCase()} private{" "}
        {chefs.length === 1 ? "chef" : "chefs"} serving {city}. View menus, read
        reviews, and message them directly to plan your event.
      </p>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 mt-8">
        {chefs.map((c) => (
          <ChefCard key={c.id} chef={c} />
        ))}
      </div>
    </div>
  );
}
