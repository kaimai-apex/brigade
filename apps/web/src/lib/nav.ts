/** Primary app navigation — Feed → Brigade → Directory → Mentors → Messages → Profile */
export const PRIMARY_NAV = [
  { href: "/feed", label: "Feed" },
  { href: "/brigade", label: "Brigade" },
  { href: "/directory", label: "Directory" },
  { href: "/mentors", label: "Mentors" },
  { href: "/messages", label: "Messages" },
  { href: "/profile/me", label: "Profile" },
] as const;

export const SECONDARY_NAV = [
  { href: "/sessions", label: "Your sessions" },
  { href: "/mentorship", label: "Your mentoring" },
  { href: "/companies", label: "Companies" },
  { href: "/notifications", label: "Alerts" },
  { href: "/settings/notifications", label: "Settings" },
] as const;
