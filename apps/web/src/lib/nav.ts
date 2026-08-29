/**
 * Primary destinations. Same four places on every authenticated surface.
 */
export const PRIMARY_NAV = [
  { href: "/learn", label: "Learn" },
  { href: "/accelerator", label: "Accelerator" },
  { href: "/apply", label: "Apply" },
  { href: "/profile/me", label: "Profile" },
] as const;

/** Behind the account menu, not in the tab bar. */
export const SECONDARY_NAV = [
  { href: "/sessions", label: "Your sessions" },
  { href: "/directory", label: "Directory" },
  { href: "/settings/profile", label: "Settings" },
] as const;
