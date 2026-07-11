import { getMapPins, getNeighbourhoods } from '@/lib/explore';
import { ExploreHeader } from '@/components/explore/explore-header';
import { ExploreMap } from '@/components/explore/explore-map';

export const metadata = {
  title: 'Hospitality Map · Explore · Brigade',
};

export default function MapPage() {
  const pins = getMapPins();
  const neighbourhoods = getNeighbourhoods();

  return (
    <div>
      <ExploreHeader
        title="📍 Hospitality Map"
        description="Restaurants, schools, suppliers and open jobs across the GTA. Toggle layers, jump to a neighbourhood, and click any pin for details."
      />
      <ExploreMap pins={pins} neighbourhoods={neighbourhoods} />
    </div>
  );
}
