import Link from "next/link";
import type { MentorFacets } from "@/lib/server/mentorship-db";
import { cn } from "@/lib/utils";
import { ScrollRail } from "@/components/mentorship/scroll-rail";
import { SKILLS } from "@/lib/onboarding/taxonomy";

type ActiveFilters = {
  q?: string;
  role?: string;
  city?: string;
  expertise?: string;
  sort?: string;
};

function hrefFor(next: ActiveFilters) {
  const params = new URLSearchParams();
  if (next.q) params.set("q", next.q);
  if (next.role) params.set("role", next.role);
  if (next.city) params.set("city", next.city);
  if (next.expertise) params.set("expertise", next.expertise);
  if (next.sort && next.sort !== "price") params.set("sort", next.sort);
  const qs = params.toString();
  return qs ? `/mentors?${qs}` : "/mentors";
}

/**
 * Horizontal skill/city chips from live mentor facets — text only, no random
 * icons pretending to mean something.
 */
export function CategoryRail({
  facets,
  active,
}: {
  facets: MentorFacets;
  active: ActiveFilters;
}) {
  type Chip = {
    label: string;
    href: string;
    pressed: boolean;
  };

  const chips: Chip[] = [
    {
      label: "All",
      href: hrefFor({ q: active.q, sort: active.sort }),
      pressed: !active.role && !active.expertise && !active.city,
    },
  ];

  const liveExpertise = facets.expertise.map((t) => t.value);
  // When the marketplace is empty, still show the skills mentors can teach so
  // the directory isn't a blank wall — and so a hero dropdown pick still lands
  // on a page that acknowledges the skill.
  const expertiseValues =
    liveExpertise.length > 0 ? liveExpertise : [...SKILLS].slice(0, 12);

  // Keep a selected skill visible even if it fell outside the fallback slice.
  if (
    active.expertise &&
    !expertiseValues.includes(active.expertise)
  ) {
    expertiseValues.unshift(active.expertise);
  }

  for (const tag of expertiseValues) {
    chips.push({
      label: tag,
      href: hrefFor({
        ...active,
        expertise: tag,
        role: undefined,
        city: undefined,
      }),
      pressed: active.expertise === tag,
    });
  }

  for (const role of facets.roles) {
    if (expertiseValues.includes(role.value)) continue;
    chips.push({
      label: role.value,
      href: hrefFor({
        ...active,
        role: role.value,
        expertise: undefined,
        city: undefined,
      }),
      pressed: active.role === role.value,
    });
  }

  for (const city of facets.cities.slice(0, 8)) {
    chips.push({
      label: city.value,
      href: hrefFor({
        ...active,
        city: city.value,
        role: undefined,
        expertise: undefined,
      }),
      pressed: active.city === city.value,
    });
  }

  return (
    <nav className="mt-6" aria-label="Mentor categories">
      <ScrollRail>
        {chips.map((chip) => (
          <Link
            key={`${chip.label}-${chip.href}`}
            href={chip.href}
            aria-current={chip.pressed ? "page" : undefined}
            className={cn(
              "shrink-0 snap-start rounded-full border px-4 py-2 text-[14px] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mk-ink)]/20",
              chip.pressed
                ? "border-[var(--mk-ink)] bg-[var(--mk-ink)] font-semibold text-[var(--brand-white)]"
                : "border-[var(--mk-line)] bg-[var(--mk-surface)] text-[var(--mk-muted)] hover:border-[var(--mk-ink)]/30 hover:text-[var(--mk-text)]",
            )}
          >
            {chip.label}
          </Link>
        ))}
      </ScrollRail>
    </nav>
  );
}
