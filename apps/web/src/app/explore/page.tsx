import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import {
  getFeaturedRestaurants,
  getNews,
  getRestaurants,
  getSchools,
  getJobs,
} from '@/lib/explore';
import { ExploreHeader } from '@/components/explore/explore-header';
import { SectionGrid } from '@/components/explore/section-grid';
import { RestaurantCard } from '@/components/explore/restaurant-card';
import { Card } from '@/components/ui/card';

export const metadata = {
  title: 'Explore · Brigade',
  description:
    'Discover Toronto’s hospitality world — restaurants, professionals, news, schools, suppliers and jobs.',
};

export default function ExplorePage() {
  const featured = getFeaturedRestaurants().slice(0, 3);
  const news = getNews().slice(0, 4);

  const stats = [
    { label: 'Cities live', value: '8+' },
    { label: 'Curated venues', value: getRestaurants().length },
    { label: 'Schools', value: getSchools().length },
    { label: 'Live jobs', value: getJobs().length },
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

      {/* Featured restaurants preview */}
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
          {featured.map((r) => (
            <li key={r.id}>
              <RestaurantCard restaurant={r} />
            </li>
          ))}
        </ul>
      </section>

      {/* Latest news preview */}
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
          {news.map((item) => (
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
