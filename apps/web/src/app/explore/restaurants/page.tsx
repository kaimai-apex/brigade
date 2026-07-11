import { loadRestaurants, resolveLocation } from '@/lib/explore/loader';
import { ExploreHeader } from '@/components/explore/explore-header';
import { LocationSwitcher } from '@/components/explore/location-switcher';
import { RestaurantDirectory } from '@/components/explore/restaurant-directory';
import { Card } from '@/components/ui/card';

export const metadata = {
  title: 'Featured Restaurants · Explore · Brigade',
};

type SP = {
  loc?: string;
  q?: string;
  search?: string;
  cuisine?: string;
  price?: string;
  accolade?: string;
  page?: string;
};

export default async function RestaurantsPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const location = await resolveLocation(sp);
  const filters = {
    cuisine: sp.cuisine,
    price: sp.price,
    accolade: sp.accolade,
    search: sp.search,
    page: sp.page ? parseInt(sp.page, 10) : 1,
  };
  const { restaurants, total, page, limit, attribution, ok } =
    await loadRestaurants(location, filters);

  return (
    <div>
      <ExploreHeader
        title="🍽️ Featured Restaurants"
        description={`Live restaurants across ${location.name}, served from Brigade’s database (sourced from OpenStreetMap, overlaid with Michelin & Canada’s 100 Best). Pick a location or search any city — filtering runs server-side.`}
      />

      <LocationSwitcher
        basePath="/explore/restaurants"
        activeSlug={location.slug}
        activeName={location.name}
      />

      {!ok && restaurants.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="font-display text-2xl font-bold">
            Couldn’t reach the directory service
          </p>
          <p className="mx-auto mt-3 max-w-md text-ink/65">
            explore-service didn’t respond. Make sure the backend is running
            (`pnpm dev:stack`), then try again.
          </p>
        </Card>
      ) : (
        <RestaurantDirectory
          restaurants={restaurants}
          total={total}
          page={page}
          limit={limit}
          attribution={attribution}
          basePath="/explore/restaurants"
          filters={{
            search: sp.search ?? '',
            cuisine: sp.cuisine ?? '',
            price: sp.price ?? '',
            accolade: sp.accolade ?? '',
          }}
          preserve={{ loc: sp.loc, q: sp.q }}
        />
      )}
    </div>
  );
}
