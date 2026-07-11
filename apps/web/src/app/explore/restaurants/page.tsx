import { loadRestaurants, resolveLocation } from '@/lib/explore/loader';
import { ExploreHeader } from '@/components/explore/explore-header';
import { LocationSwitcher } from '@/components/explore/location-switcher';
import { RestaurantDirectory } from '@/components/explore/restaurant-directory';
import { Card } from '@/components/ui/card';

export const metadata = {
  title: 'Featured Restaurants · Explore · Brigade',
};

export default async function RestaurantsPage({
  searchParams,
}: {
  searchParams: Promise<{ loc?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const location = await resolveLocation(sp);
  const { restaurants, attribution, ok } = await loadRestaurants(location);

  return (
    <div>
      <ExploreHeader
        title="🍽️ Featured Restaurants"
        description={`Live restaurants across ${location.name}, loaded from OpenStreetMap and overlaid with Michelin & Canada’s 100 Best accolades. Pick a location or search any city.`}
      />

      <LocationSwitcher
        basePath="/explore/restaurants"
        activeSlug={location.slug}
        activeName={location.name}
      />

      {!ok && restaurants.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="font-display text-2xl font-bold">
            Couldn’t reach the map data source
          </p>
          <p className="mx-auto mt-3 max-w-md text-ink/65">
            OpenStreetMap didn’t respond just now. Try again in a moment, or pick
            another location.
          </p>
        </Card>
      ) : (
        <RestaurantDirectory
          restaurants={restaurants}
          attribution={attribution}
        />
      )}
    </div>
  );
}
