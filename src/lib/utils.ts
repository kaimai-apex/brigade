import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getInitials(firstName?: string | null, lastName?: string | null) {
  const first = firstName?.trim().charAt(0) ?? "";
  const last = lastName?.trim().charAt(0) ?? "";
  return (first + last).toUpperCase() || "?";
}

export function formatLocation(
  city?: string | null,
  state?: string | null,
  country?: string | null,
) {
  return [city, state, country].filter(Boolean).join(", ");
}

export function displayName(firstName?: string | null, lastName?: string | null) {
  return [firstName, lastName].filter(Boolean).join(" ") || "Brigade Member";
}
