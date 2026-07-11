/** Primary app navigation — Discover → Network → My Brigades → Opportunities */
export const PRIMARY_NAV = [
  { href: "/discover", label: "Discover" },
  { href: "/network", label: "Network" },
  { href: "/my-brigades", label: "My Brigades" },
  { href: "/opportunities", label: "Opportunities" },
  { href: "/messages", label: "Messages" },
] as const;

export const SECONDARY_NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/feed", label: "Feed" },
  { href: "/companies", label: "Companies" },
  { href: "/notifications", label: "Alerts" },
  { href: "/settings/notifications", label: "Settings" },
] as const;
