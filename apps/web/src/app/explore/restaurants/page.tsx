import { getRestaurants } from '@/lib/explore';
import { ExploreHeader } from '@/components/explore/explore-header';
import { RestaurantDirectory } from '@/components/explore/restaurant-directory';

export const metadata = {
  title: 'Featured Restaurants · Explore · Brigade',
};

export default function RestaurantsPage() {
  const restaurants = getRestaurants();

  return (
    <div>
      <ExploreHeader
        title="🍽️ Featured Restaurants"
        description="Curated Toronto rooms — from Michelin stars and Canada’s 100 Best to neighbourhood favourites. Every venue links out to its own site; owners can claim their page."
      />
      <RestaurantDirectory restaurants={restaurants} />
    </div>
  );
}
