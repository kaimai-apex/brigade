export type ProfileBanner = {
  id: string;
  label: string;
  description: string;
  src: string;
};

/** Hospitality-themed cover banners — pickable at signup & profile edit */
export const PROFILE_BANNERS: ProfileBanner[] = [
  {
    id: "kitchen-line",
    label: "Kitchen line",
    description: "The pass — pans, steam, service",
    src: "/banners/banner-kitchen-line.png",
  },
  {
    id: "fine-dining",
    label: "Fine dining",
    description: "Michelin-ready dining room",
    src: "/banners/banner-fine-dining.png",
  },
  {
    id: "taco-truck",
    label: "Taco truck",
    description: "Street food & food trucks",
    src: "/banners/banner-taco-truck.png",
  },
  {
    id: "cocktail-bar",
    label: "Cocktail bar",
    description: "Craft cocktails after dark",
    src: "/banners/banner-cocktail-bar.png",
  },
  {
    id: "wedding-event",
    label: "Wedding & events",
    description: "Receptions under the lights",
    src: "/banners/banner-wedding-event.png",
  },
  {
    id: "pastry",
    label: "Pastry & bakery",
    description: "Sweet side of the house",
    src: "/banners/banner-pastry.png",
  },
  {
    id: "hotel-lobby",
    label: "Hotel lobby",
    description: "Luxury hospitality",
    src: "/banners/banner-hotel-lobby.png",
  },
  {
    id: "wine-cellar",
    label: "Wine cellar",
    description: "Sommelier & beverage",
    src: "/banners/banner-wine-cellar.png",
  },
];

const DEFAULT_BANNER = PROFILE_BANNERS[0];

export function getBannerById(id?: string | null): ProfileBanner {
  if (!id) return DEFAULT_BANNER;
  return PROFILE_BANNERS.find((b) => b.id === id || b.src === id) ?? DEFAULT_BANNER;
}

export function resolveBannerUrl(coverUrl?: string | null, seed?: string | null): string {
  if (coverUrl?.trim()) {
    const match = getBannerById(coverUrl.trim());
    if (PROFILE_BANNERS.some((b) => b.id === coverUrl || b.src === coverUrl)) {
      return match.src;
    }
    // Custom uploaded URL
    if (coverUrl.startsWith("http") || coverUrl.startsWith("/")) {
      return coverUrl;
    }
    return match.src;
  }
  // Stable default from seed so empty profiles still look intentional
  if (seed) {
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
    return PROFILE_BANNERS[h % PROFILE_BANNERS.length].src;
  }
  return DEFAULT_BANNER.src;
}
