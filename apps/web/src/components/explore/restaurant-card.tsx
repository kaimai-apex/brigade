import Link from 'next/link';
import { ExternalLink, MapPin, Star } from 'lucide-react';
import type { Restaurant } from '@/lib/explore';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

/** Accolade sources that earn the gold "starred" treatment. */
function isPrestige(source: string) {
  return source === 'Michelin' || source === "Canada's 100 Best";
}

function CardBody({ restaurant }: { restaurant: Restaurant }) {
  const external = restaurant.source === 'osm';
  return (
    <Card className="flex h-full flex-col transition group-hover:-translate-y-1 group-hover:shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {restaurant.neighbourhood && (
            <p className="flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-forest">
              <MapPin className="size-3" />
              {restaurant.neighbourhood}
            </p>
          )}
          <h2 className="mt-1 truncate font-display text-xl font-bold leading-tight group-hover:text-forest">
            {restaurant.name}
            {external && (
              <ExternalLink className="ml-1.5 inline size-3.5 align-baseline text-ink/35" />
            )}
          </h2>
        </div>
        {restaurant.priceLevel && (
          <span className="shrink-0 font-body text-sm font-bold text-ink/50">
            {restaurant.priceLevel}
          </span>
        )}
      </div>

      {restaurant.accolades.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {restaurant.accolades.slice(0, 2).map((a) => (
            <Badge
              key={`${a.source}-${a.detail}`}
              variant={isPrestige(a.source) ? 'default' : 'secondary'}
              className={
                isPrestige(a.source)
                  ? 'gap-1 bg-gold/15 text-[#8a6d1f]'
                  : 'gap-1 bg-secondary text-secondary-foreground'
              }
            >
              {isPrestige(a.source) && <Star className="size-3 fill-current" />}
              {a.source}: {a.detail}
            </Badge>
          ))}
        </div>
      )}

      {restaurant.blurb && (
        <p className="mt-3 line-clamp-3 flex-1 text-sm leading-relaxed text-ink/75">
          {restaurant.blurb}
        </p>
      )}

      {restaurant.cuisineTags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {restaurant.cuisineTags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="outline">
              {tag}
            </Badge>
          ))}
        </div>
      )}
    </Card>
  );
}

export function RestaurantCard({ restaurant }: { restaurant: Restaurant }) {
  // Curated venues open their rich in-app page; live OSM venues link out.
  if (restaurant.source === 'osm') {
    return (
      <a
        href={restaurant.externalUrl ?? '#'}
        target="_blank"
        rel="noopener noreferrer"
        className="group block h-full"
      >
        <CardBody restaurant={restaurant} />
      </a>
    );
  }

  return (
    <Link
      href={`/explore/restaurants/${restaurant.slug}`}
      className="group block h-full"
    >
      <CardBody restaurant={restaurant} />
    </Link>
  );
}
