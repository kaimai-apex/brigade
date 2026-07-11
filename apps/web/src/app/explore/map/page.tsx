import { withinBbox, type MapPin } from '@/lib/explore';
import {
  loadDirectoryMapPins,
  loadNeighbourhoods,
  loadRestaurants,
  resolveLocation,
} from '@/lib/explore/loader';
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
  // Pull the whole area for the map, not just the first directory page.
  const [{ restaurants }, otherPins, neighbourhoods] = await Promise.all([
    loadRestaurants(location, { limit: 2000 }),
    loadDirectoryMapPins(location.bbox),
    loadNeighbourhoods(location.bbox),
  ]);

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

  const directoryPins = otherPins.filter((p) =>
    withinBbox(p.lat, p.lng, location.bbox),
  );

  const localNeighbourhoods = neighbourhoods.filter((n) =>
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
        pins={[...restaurantPins, ...directoryPins]}
        bbox={location.bbox}
        neighbourhoods={localNeighbourhoods}
      />
    </div>
  );
}
