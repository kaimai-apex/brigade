import Link from "next/link";
import type { MentorFacets } from "@/lib/server/mentorship-db";
import { cn } from "@/lib/utils";

type ActiveFilters = {
  q?: string;
  role?: string;
  city?: string;
  expertise?: string;
  sort?: string;
};

const ICONS = [
  "orb",
  "new",
  "bolt",
  "medal",
  "sparkles",
  "pen",
  "code",
  "megaphone",
  "cube",
  "users",
  "chart",
  "handshake",
  "quote",
  "blocks",
  "search",
  "arrow",
] as const;

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
 * ADPList horizontal icon strip under the toolbar.
 * Categories come from live mentor facets; glyphs match the clone footprint.
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
    icon: string;
    dot?: boolean;
  };

  const chips: Chip[] = [
    {
      label: "All",
      href: hrefFor({ q: active.q, sort: active.sort }),
      pressed: !active.role && !active.expertise && !active.city && active.sort !== "newest",
      icon: "orb",
    },
    {
      label: "New",
      href: hrefFor({ q: active.q, sort: "newest" }),
      pressed: active.sort === "newest" && !active.role && !active.expertise && !active.city,
      icon: "new",
      dot: true,
    },
  ];

  let iconIdx = 2;
  for (const role of facets.roles) {
    chips.push({
      label: role.value,
      href: hrefFor({ ...active, role: role.value, expertise: undefined, city: undefined, sort: active.sort === "newest" ? "price" : active.sort }),
      pressed: active.role === role.value,
      icon: ICONS[iconIdx % ICONS.length]!,
    });
    iconIdx += 1;
  }

  for (const tag of facets.expertise) {
    if (facets.roles.some((r) => r.value === tag.value)) continue;
    chips.push({
      label: tag.value,
      href: hrefFor({
        ...active,
        expertise: tag.value,
        role: undefined,
        city: undefined,
        sort: active.sort === "newest" ? "price" : active.sort,
      }),
      pressed: active.expertise === tag.value,
      icon: ICONS[iconIdx % ICONS.length]!,
      dot: iconIdx % 5 === 0,
    });
    iconIdx += 1;
  }

  return (
    <nav
      className="mk-rail mt-6 items-start gap-7"
      aria-label="Mentor categories"
    >
      {chips.map((chip) => (
        <Link
          key={`${chip.label}-${chip.href}`}
          href={chip.href}
          aria-current={chip.pressed ? "page" : undefined}
          className="group flex shrink-0 flex-col items-center gap-2"
        >
          <span
            className={cn(
              "relative grid h-12 w-12 place-items-center rounded-xl transition",
              chip.pressed ? "bg-[var(--mk-wash-strong)]" : "group-hover:bg-[var(--mk-wash)]",
            )}
          >
            <CategoryGlyph icon={chip.icon} />
            {chip.dot && (
              <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[var(--mk-dot-rose)]" />
            )}
          </span>
          <span
            className={cn(
              "whitespace-nowrap border-b-2 pb-1 text-[13px]",
              chip.pressed
                ? "border-[var(--mk-text)] font-semibold text-[var(--mk-text)]"
                : "border-transparent text-[var(--mk-muted)]",
            )}
          >
            {chip.label}
          </span>
        </Link>
      ))}
    </nav>
  );
}

function CategoryGlyph({ icon }: { icon: string }) {
  const paths: Record<string, string> = {
    orb: "M12 3a9 9 0 100 18 9 9 0 000-18zm0 3.2a5.8 5.8 0 110 11.6 5.8 5.8 0 010-11.6z",
    new: "M4 6h16v12H4V6zm2.4 2.4v7.2h2V12l2 3.6h1.6V8.4h-2v3.6l-2-3.6H6.4zm7.8 0v7.2h4.8v-1.8h-2.8v-1h2.4v-1.7h-2.4v-.9h2.8V8.4h-4.8z",
    bolt: "M13 2.5L5 13.5h6l-1 8 8-11h-6l1-8z",
    medal:
      "M12 2.5l2.3 4.7 5.2.8-3.8 3.6.9 5.1-4.6-2.4-4.6 2.4.9-5.1L4.5 8l5.2-.8L12 2.5zM8.6 16.4L7 22l5-2.2L17 22l-1.6-5.6-3.4 1.8-3.4-1.8z",
    sparkles:
      "M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8L12 3zM18 15l.9 2.3 2.3.9-2.3.9-.9 2.3-.9-2.3-2.3-.9 2.3-.9L18 15z",
    arrow: "M7 17L17 7M9 7h8v8",
    quote:
      "M7 6c-2.2 0-4 1.8-4 4s1.8 4 4 4h.9C7.4 15.7 5.9 17 4 17.5V20c4-.7 7-4.4 7-9 0-2.8-1.8-5-4-5zm10 0c-2.2 0-4 1.8-4 4s1.8 4 4 4h.9c-.5 1.8-2 3.1-3.9 3.6V20c4-.7 7-4.4 7-9 0-2.8-1.8-5-4-5z",
    chart: "M4 20V10h4v10H4zm6 0V4h4v16h-4zm6 0v-7h4v7h-4z",
    pen: "M15.7 3.3l5 5L8.8 20.2 3 21.5l1.3-5.8L15.7 3.3zm0 2.8L6.1 15.7l-.5 2.7 2.7-.5 9.6-9.6-2.2-2.2z",
    code: "M9.4 7.6L4 13l5.4 5.4 1.4-1.4L6.8 13l4-4-1.4-1.4zm5.2 0l-1.4 1.4 4 4-4 4 1.4 1.4L20 13l-5.4-5.4z",
    megaphone:
      "M3 10v4a2 2 0 002 2h1l3 5h2l-2.5-5H10l8 4V5l-8 4H5a2 2 0 00-2 1z",
    blocks: "M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm10 0h8v8h-8v-8z",
    cube: "M12 2.5l8 4.5v9l-8 4.5-8-4.5v-9l8-4.5zm0 2.3L6 8.2v7.6l6 3.4 6-3.4V8.2l-6-3.4z",
    search:
      "M10.5 3a7.5 7.5 0 105.9 12.1l4.3 4.3 1.4-1.4-4.3-4.3A7.5 7.5 0 0010.5 3zm0 2a5.5 5.5 0 110 11 5.5 5.5 0 010-11z",
    handshake: "M2 11l4-4 3 2 3-2 3 2 3-2 4 4-4 5-3-2-3 3-3-3-3 2-4-5z",
    users:
      "M9 11a4 4 0 100-8 4 4 0 000 8zm7 0a3 3 0 100-6 3 3 0 000 6zM1 20c0-3.3 3.6-5.5 8-5.5s8 2.2 8 5.5v1H1v-1zm17 1v-1c0-1.9-.8-3.5-2.1-4.6 3.4.4 6.1 2.3 6.1 4.6v1h-4z",
  };
  const d = paths[icon] ?? paths.cube!;
  const stroked = icon === "arrow";
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d={d}
        fill={stroked ? "none" : "var(--mk-icon)"}
        stroke={stroked ? "var(--mk-icon)" : "none"}
        strokeWidth={stroked ? 1.9 : 0}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
