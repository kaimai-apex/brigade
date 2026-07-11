import {
  getMapPins,
  getNeighbourhoods,
  withinBbox,
  type MapPin,
} from '@/lib/explore';
import { loadRestaurants, resolveLocation } from '@/lib/explore/loader';
import { ExploreHeader } from '@/components/explore/explore-header';
import { ExploreMap } from '@/components/explore/explore-map';
import { LocationSwitcher } from '@/components/explore/location-switcher';

export const metadata = {
  title: 'Hospitality Map · Explore · Brigade',
};

export default async function MapPage({
  searchParams,
}: {
  searchParams: Promise<{ loc?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const location = await resolveLocation(sp);
  const { restaurants } = await loadRestaurants(location);

  // Live restaurant pins for this location.
  const restaurantPins: MapPin[] = restaurants.map((r) => ({
    id: r.id,
    layer: 'restaurants',
    name: r.name,
    lat: r.lat,
    lng: r.lng,
    href:
      r.source === 'osm'
        ? r.externalUrl
        : `/explore/restaurants/${r.slug}`,
    meta: r.neighbourhood ?? r.cuisineTags[0],
  }));

  // Curated schools / suppliers / jobs pins that fall inside this viewport.
  const otherPins = getMapPins().filter(
    (p) => p.layer !== 'restaurants' && withinBbox(p.lat, p.lng, location.bbox),
  );

  const neighbourhoods = getNeighbourhoods().filter((n) =>
    withinBbox(n.lat, n.lng, location.bbox),
  );

  return (
    <div>
      <ExploreHeader
        title="📍 Hospitality Map"
        description={`Restaurants, schools, suppliers and open jobs across ${location.name}. Toggle layers, jump to a neighbourhood, and click any pin for details.`}
      />
      <LocationSwitcher
        basePath="/explore/map"
        activeSlug={location.slug}
        activeName={location.name}
      />
      <ExploreMap
        pins={[...restaurantPins, ...otherPins]}
        bbox={location.bbox}
        neighbourhoods={neighbourhoods}
      />
    </div>
  );
}
