/**
 * Primary app navigation.
 *
 * Four places, which is the whole product: find someone to learn from, look
 * through the members, see your booked sessions, and be findable yourself.
 * Feed, Brigade, Messages, Companies and Alerts went with the social network —
 * a nav that still listed them would be six tabs describing a product that no
 * longer exists.
 */
export const PRIMARY_NAV = [
  { href: "/mentors", label: "Mentors" },
  { href: "/directory", label: "Directory" },
  { href: "/sessions", label: "Sessions" },
  { href: "/profile/me", label: "Profile" },
] as const;

/** Behind the account menu, not in the tab bar. */
export const SECONDARY_NAV = [
  { href: "/mentorship", label: "Your mentoring" },
  { href: "/settings/profile", label: "Settings" },
] as const;
