"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, SlidersHorizontal } from "lucide-react";

/**
 * Explore toolbar: search by name/kitchen + sort.
 */
export function MentorSearch({
  initialQuery,
  sort = "price",
}: {
  initialQuery: string;
  sort?: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(initialQuery);

  useEffect(() => {
    setValue(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    if (value === initialQuery) return;
    const timer = setTimeout(() => {
      const params = new URLSearchParams();
      const trimmed = value.trim();
      if (trimmed) params.set("q", trimmed);
      if (sort && sort !== "price") params.set("sort", sort);
      const qs = params.toString();
      router.push(qs ? `/mentors?${qs}` : "/mentors");
    }, 280);
    return () => clearTimeout(timer);
  }, [value, initialQuery, sort, router]);

  const sortHref = (nextSort: string) => {
    const params = new URLSearchParams();
    if (value.trim()) params.set("q", value.trim());
    if (nextSort !== "price") params.set("sort", nextSort);
    const qs = params.toString();
    return qs ? `/mentors?${qs}` : "/mentors";
  };

  return (
    <div className="flex flex-wrap items-stretch gap-3">
      <div className="relative flex min-w-0 flex-1 basis-[min(100%,280px)] items-center rounded-2xl border border-[var(--mk-line)] bg-[var(--mk-surface)] px-4 focus-within:ring-2 focus-within:ring-[var(--mk-ink)]/15">
        <Search className="size-[19px] shrink-0 text-[var(--mk-muted)]" aria-hidden />
        <input
          type="search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Search by name or kitchen…"
          aria-label="Search mentors by name or kitchen"
          className="h-14 min-w-0 flex-1 border-0 bg-transparent px-3 text-[15px] text-[var(--mk-text)] outline-none placeholder:text-[var(--mk-muted)]"
        />
      </div>

      <details className="relative">
        <summary className="flex h-14 cursor-pointer list-none items-center gap-2.5 rounded-2xl border border-[var(--mk-line)] bg-[var(--mk-surface)] px-5 text-[15px] font-medium text-[var(--mk-text)] hover:bg-[var(--mk-wash)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mk-ink)]/20 [&::-webkit-details-marker]:hidden">
          <SlidersHorizontal className="size-5" aria-hidden />
          Sort
          {sort !== "price" && (
            <span className="rounded-full bg-[var(--mk-wash-strong)] px-2 py-0.5 text-[12px] font-semibold text-[var(--mk-text)]">
              {sort === "newest" ? "Newest" : sort === "name" ? "Name" : "Price"}
            </span>
          )}
        </summary>
        <div className="absolute right-0 z-20 mt-2 w-56 rounded-2xl border border-[var(--mk-line)] bg-[var(--mk-surface)] p-3 shadow-[var(--mk-shadow-lift)]">
          <p className="px-1 text-[12px] font-semibold uppercase tracking-wide text-[var(--mk-muted)]">
            Order by
          </p>
          <div className="mt-2 flex flex-col gap-1">
            {(
              [
                ["price", "Price"],
                ["newest", "Newest"],
                ["name", "Name"],
              ] as const
            ).map(([nextSort, label]) => (
              <Link
                key={nextSort}
                href={sortHref(nextSort)}
                className={`rounded-lg px-3 py-2 text-[14px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mk-ink)]/20 ${
                  sort === nextSort
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
