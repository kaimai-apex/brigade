import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { getFeaturedRestaurants, getRestaurants } from '@/lib/explore';
import {
  loadJobListings,
  loadNews,
  loadRestaurants,
  loadSchools,
  resolveLocation,
} from '@/lib/explore/loader';
import { ExploreHeader } from '@/components/explore/explore-header';
import { SectionGrid } from '@/components/explore/section-grid';
import { RestaurantCard } from '@/components/explore/restaurant-card';
import { Card } from '@/components/ui/card';

export const metadata = {
  title: 'Explore · Brigade',
  description:
    'Discover Toronto’s hospitality world — restaurants, professionals, news, schools, suppliers and jobs.',
};

export default async function ExplorePage() {
  const location = await resolveLocation({});
  const [restaurantPage, schools, news, jobs] = await Promise.all([
    loadRestaurants(location, { limit: 60 }),
    loadSchools(),
    loadNews(),
    loadJobListings(),
  ]);

  const featured =
    restaurantPage.restaurants.filter((r) => r.featured).slice(0, 3);
  const featuredFallback = getFeaturedRestaurants().slice(0, 3);
  const featuredShow = featured.length ? featured : featuredFallback;
  const newsShow = news.slice(0, 4);

  const venueCount = restaurantPage.ok
    ? restaurantPage.total
    : getRestaurants().length;

  const stats = [
    { label: 'Cities live', value: '8+' },
    { label: 'Venues', value: venueCount },
    { label: 'Schools', value: schools.length },
    { label: 'Live jobs', value: jobs.length },
  ];

  return (
    <div>
      <ExploreHeader
        title="Explore Toronto’s hospitality world"
        description="Even before your network fills up, Explore is useful daily — curated restaurants, industry news, schools, suppliers, and fresh jobs across the GTA."
      >
        <div className="mt-6 flex flex-wrap gap-6">
          {stats.map((s) => (
            <div key={s.label}>
              <span className="font-display text-2xl font-black text-forest">
                {s.value}
              </span>
              <span className="ml-1.5 text-sm text-ink/60">{s.label}</span>
            </div>
          ))}
        </div>
      </ExploreHeader>

      <SectionGrid />

      <section className="mt-12">
        <div className="mb-4 flex items-end justify-between">
          <h2 className="font-display text-2xl font-black tracking-tight">
            🍽️ Featured restaurants
          </h2>
          <Link
            href="/explore/restaurants"
            className="inline-flex items-center gap-1 text-sm font-semibold text-rust hover:underline"
          >
            See all <ArrowRight className="size-4" />
          </Link>
        </div>
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {featuredShow.map((r) => (
            <li key={r.id}>
              <RestaurantCard restaurant={r} />
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12">
        <div className="mb-4 flex items-end justify-between">
          <h2 className="font-display text-2xl font-black tracking-tight">
            📰 Latest industry news
          </h2>
          <Link
            href="/explore/news"
            className="inline-flex items-center gap-1 text-sm font-semibold text-rust hover:underline"
          >
            See all <ArrowRight className="size-4" />
          </Link>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2">
          {newsShow.map((item) => (
            <li key={item.id}>
              <a href={item.url} target="_blank" rel="noopener noreferrer">
                <Card className="h-full p-4 transition hover:shadow-md">
                  <p className="text-xs font-semibold text-forest">
                    {item.source}
                  </p>
                  <p className="mt-1 font-display font-bold leading-snug">
                    {item.title}
                  </p>
                </Card>
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
