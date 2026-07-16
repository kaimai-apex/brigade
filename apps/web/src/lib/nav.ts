/** Primary app navigation — Feed → Brigade → Discover → Messages → Profile */
export const PRIMARY_NAV = [
  { href: "/feed", label: "Feed" },
  { href: "/brigade", label: "Brigade" },
  { href: "/discover", label: "Discover" },
  { href: "/messages", label: "Messages" },
  { href: "/profile/me", label: "Profile" },
] as const;

export const SECONDARY_NAV = [
  { href: "/companies", label: "Companies" },
  { href: "/notifications", label: "Alerts" },
  { href: "/settings/notifications", label: "Settings" },
] as const;
