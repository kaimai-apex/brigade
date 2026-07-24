/** Primary app navigation — Feed → Brigade → Directory → Messages → Profile */
export const PRIMARY_NAV = [
  { href: "/feed", label: "Feed" },
  { href: "/brigade", label: "Brigade" },
  { href: "/directory", label: "Directory" },
  { href: "/messages", label: "Messages" },
  { href: "/profile/me", label: "Profile" },
] as const;

export const SECONDARY_NAV = [
  { href: "/companies", label: "Companies" },
  { href: "/notifications", label: "Alerts" },
  { href: "/settings/notifications", label: "Settings" },
] as const;
