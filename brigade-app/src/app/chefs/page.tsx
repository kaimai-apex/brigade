import type { Metadata } from "next";
import Link from "next/link";
import { getLiveChefs } from "@/lib/store";
import { CITIES, CUISINES } from "@/lib/seed";
import { priceBand, type PriceBand } from "@/lib/types";
import { ChefCard } from "@/components/ui";

export const metadata: Metadata = {
  title: "Find a private chef",
  description:
    "Browse verified independent private chefs by city, cuisine and price. Hire directly — no agency fees.",
};

// Reads from the mutable store (approvals can change) → always fresh.
export const dynamic = "force-dynamic";

const PRICE_BANDS: PriceBand[] = ["$", "$$", "$$$"];

export default async function DirectoryPage({
  searchParams,
}: {
  searchParams: Promise<{ city?: string; cuisine?: string; price?: string; q?: string }>;
}) {
  const { city = "", cuisine = "", price = "", q = "" } = await searchParams;
  const all = await getLiveChefs();

  const query = q.trim().toLowerCase();
  const results = all.filter((c) => {
    if (city && c.city !== city) return false;
    if (cuisine && !c.cuisines.includes(cuisine)) return false;
    if (price && priceBand(c.eventRate) !== price) return false;
    if (
      query &&
      !(
        c.name.toLowerCase().includes(query) ||
        c.headline.toLowerCase().includes(query) ||
        c.cuisines.some((x) => x.toLowerCase().includes(query))
      )
    )
      return false;
    return true;
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Find a private chef</h1>
        <p className="text-stone-600 mt-1">
          {all.length} verified chefs across {CITIES.length} cities. Hire directly —
          we never take a cut of your dinner.
        </p>
      </header>

      <form
        method="get"
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 bg-paper border border-stone-200 rounded-xl p-4 mb-8"
      >
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search name or cuisine"
          className="rounded-md border border-stone-300 px-3 py-2 text-sm lg:col-span-2"
        />
        <select name="city" defaultValue={city} className="rounded-md border border-stone-300 px-3 py-2 text-sm">
          <option value="">All cities</option>
          {CITIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select name="cuisine" defaultValue={cuisine} className="rounded-md border border-stone-300 px-3 py-2 text-sm">
          <option value="">All cuisines</option>
          {CUISINES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <div className="flex gap-2">
          <select name="price" defaultValue={price} className="flex-1 rounded-md border border-stone-300 px-3 py-2 text-sm">
            <option value="">Any price</option>
            {PRICE_BANDS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <button className="btn btn-primary px-5">Filter</button>
        </div>
      </form>

      {results.length === 0 ? (
        <div className="text-center py-16 text-stone-500">
          <p>No chefs match those filters yet.</p>
          <Link href="/chefs" className="text-copper hover:underline">Clear filters</Link>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((c, i) => (
            <ChefCard key={c.id} chef={c} priority={i === 0} />
          ))}
        </div>
      )}
    </div>
  );
}
