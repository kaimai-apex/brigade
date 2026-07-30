'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';

/**
 * Search box for the mentor directory.
 *
 * Debounced and URL-driven, matching the member directory: the query lives in
 * the address bar so a search can be shared, bookmarked and reloaded.
 */
export function MentorSearch({ initialQuery }: { initialQuery: string }) {
  const router = useRouter();
  const [value, setValue] = useState(initialQuery);

  useEffect(() => {
    // Don't push a duplicate entry when the box already matches the URL.
    if (value === initialQuery) return;
    const timer = setTimeout(() => {
      const trimmed = value.trim();
      router.push(trimmed ? `/mentors?q=${encodeURIComponent(trimmed)}` : '/mentors');
    }, 300);
    return () => clearTimeout(timer);
  }, [value, initialQuery, router]);

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink/40" />
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search by name, role, or city"
        aria-label="Search mentors"
        className="h-12 w-full rounded-full border border-ink/15 pl-10 pr-4 text-base outline-none focus:border-forest"
      />
    </div>
  );
}
