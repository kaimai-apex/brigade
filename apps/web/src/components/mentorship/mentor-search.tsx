"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, SlidersHorizontal, Sparkles } from "lucide-react";

type Filters = {
  q?: string;
  role?: string;
  city?: string;
  expertise?: string;
  sort?: string;
};

/**
 * ADPList explore toolbar: h-14 search, AI pill, advanced toggle, Filters.
 * Words are Brigade; chrome matches the clone.
 */
export function MentorSearch({
  initialQuery,
  filters = {},
  filterCount = 0,
}: {
  initialQuery: string;
  filters?: Omit<Filters, "q">;
  filterCount?: number;
}) {
  const router = useRouter();
  const [value, setValue] = useState(initialQuery);
  const [paidOnly, setPaidOnly] = useState(false);

  useEffect(() => {
    setValue(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    if (value === initialQuery) return;
    const timer = setTimeout(() => {
      const params = new URLSearchParams();
      const trimmed = value.trim();
      if (trimmed) params.set("q", trimmed);
      if (filters.role) params.set("role", filters.role);
      if (filters.city) params.set("city", filters.city);
      if (filters.expertise) params.set("expertise", filters.expertise);
      if (filters.sort && filters.sort !== "price") params.set("sort", filters.sort);
      const qs = params.toString();
      router.push(qs ? `/mentors?${qs}` : "/mentors");
    }, 280);
    return () => clearTimeout(timer);
  }, [value, initialQuery, filters.role, filters.city, filters.expertise, filters.sort, router]);

  const sortHref = (sort: string) => {
    const params = new URLSearchParams();
    if (value.trim()) params.set("q", value.trim());
    if (filters.role) params.set("role", filters.role);
    if (filters.city) params.set("city", filters.city);
    if (filters.expertise) params.set("expertise", filters.expertise);
    if (sort !== "price") params.set("sort", sort);
    const qs = params.toString();
    return qs ? `/mentors?${qs}` : "/mentors";
  };

  return (
    <div className="flex flex-wrap items-stretch gap-3">
      <div className="relative flex min-w-[280px] flex-1 items-center rounded-2xl border border-[var(--mk-line)] bg-[var(--mk-surface)] px-4">
        <Search className="size-[19px] shrink-0 text-[var(--mk-muted)]" aria-hidden />
        <input
          type="search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Search by name, kitchen, specialty…"
          aria-label="Search mentors"
          className="h-14 min-w-0 flex-1 border-0 bg-transparent px-3 text-[15px] text-[var(--mk-text)] outline-none placeholder:text-[var(--mk-subtle)]"
        />
        <button
          type="button"
          onClick={() => setValue(value || "help me land a private chef role")}
          className="hidden shrink-0 items-center gap-1.5 rounded-full bg-[var(--mk-chip-violet-bg)] px-3.5 py-2 text-[14px] font-medium text-[var(--mk-chip-violet-text)] sm:inline-flex"
        >
          <Sparkles className="size-4" aria-hidden />
          Try AI Search
        </button>
      </div>

      <div className="flex items-center gap-3 rounded-2xl border border-[var(--mk-line)] bg-[var(--mk-surface)] px-4 py-3">
        <span className="mk-badge mk-badge-gold">New</span>
        <span className="text-[15px] font-semibold text-[var(--mk-text)]">
          Display paid sessions
        </span>
        <span className="hidden text-[15px] text-[var(--mk-subtle)] sm:inline">
          | Book focused 1:1 time
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={paidOnly}
          aria-label="Display paid sessions"
          onClick={() => setPaidOnly((v) => !v)}
          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
            paidOnly ? "bg-[var(--mk-ink)]" : "bg-[var(--mk-chip-line)]"
          }`}
        >
          <span
            className={`absolute top-0.5 size-5 rounded-full bg-[var(--mk-surface)] shadow transition-transform ${
              paidOnly ? "translate-x-[22px]" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>

      <details className="relative">
        <summary className="flex h-full cursor-pointer list-none items-center gap-2.5 rounded-2xl border border-[var(--mk-line)] bg-[var(--mk-surface)] px-5 text-[15px] font-medium text-[var(--mk-text)] hover:bg-[var(--mk-wash)] [&::-webkit-details-marker]:hidden">
          <SlidersHorizontal className="size-5" aria-hidden />
          Filters
          {filterCount > 0 && (
            <span className="grid h-5 min-w-5 place-items-center rounded-full bg-[var(--mk-ink)] px-1.5 text-[11px] font-semibold text-[var(--brand-white)]">
              {filterCount}
            </span>
          )}
        </summary>
        <div className="absolute right-0 z-20 mt-2 w-56 rounded-2xl border border-[var(--mk-line)] bg-[var(--mk-surface)] p-3 shadow-[var(--mk-shadow-lift)]">
          <p className="px-1 text-[12px] font-semibold uppercase tracking-wide text-[var(--mk-subtle)]">
            Sort
          </p>
          <div className="mt-2 flex flex-col gap-1">
            {(
              [
                ["price", "Price"],
                ["newest", "Newest"],
                ["name", "Name"],
              ] as const
            ).map(([sort, label]) => (
              <Link
                key={sort}
                href={sortHref(sort)}
                className={`rounded-lg px-3 py-2 text-[14px] ${
                  (filters.sort ?? "price") === sort
                    ? "bg-[var(--mk-wash-strong)] font-semibold text-[var(--mk-text)]"
                    : "text-[var(--mk-muted)] hover:bg-[var(--mk-wash)]"
                }`}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </details>
    </div>
  );
}
