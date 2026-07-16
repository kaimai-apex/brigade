'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api/client';
import { displayName, getInitials, personLabel } from '@/lib/utils';

export type PersonInfo = {
  name: string;
  initials: string;
  firstName?: string;
  lastName?: string;
};

const cache = new Map<string, PersonInfo>();

async function fetchPerson(id: string): Promise<PersonInfo> {
  const hit = cache.get(id);
  if (hit) return hit;
  try {
    const res = (await api.getProfile(id)) as Record<string, unknown>;
    const first = (res.firstName ?? res.first_name) as string | undefined;
    const last = (res.lastName ?? res.last_name) as string | undefined;
    const info: PersonInfo = {
      name: displayName(first, last),
      initials: getInitials(first, last),
      firstName: first,
      lastName: last,
    };
    cache.set(id, info);
    return info;
  } catch {
    const fallback: PersonInfo = { name: 'Brigade Member', initials: '?' };
    cache.set(id, fallback);
    return fallback;
  }
}

/**
 * Resolve user IDs → display names. Never surfaces UUID fragments in name slots.
 */
export function usePersonNames(ids: Array<string | null | undefined>) {
  const unique = useMemo(
    () => [...new Set(ids.filter((id): id is string => Boolean(id)))],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ids.join('|')],
  );

  const [map, setMap] = useState<Record<string, PersonInfo>>(() => {
    const initial: Record<string, PersonInfo> = {};
    for (const id of unique) {
      const hit = cache.get(id);
      if (hit) initial[id] = hit;
    }
    return initial;
  });

  useEffect(() => {
    let active = true;
    const missing = unique.filter((id) => !cache.has(id));
    if (missing.length === 0) {
      const next: Record<string, PersonInfo> = {};
      for (const id of unique) {
        const hit = cache.get(id);
        if (hit) next[id] = hit;
      }
      setMap(next);
      return;
    }

    void Promise.all(missing.map(fetchPerson)).then(() => {
      if (!active) return;
      const next: Record<string, PersonInfo> = {};
      for (const id of unique) {
        next[id] = cache.get(id) ?? { name: 'Brigade Member', initials: '?' };
      }
      setMap(next);
    });

    return () => {
      active = false;
    };
  }, [unique]);

  function label(id?: string | null, ...fallback: Array<string | null | undefined>) {
    if (!id) return personLabel(...fallback);
    return map[id]?.name ?? personLabel(...fallback);
  }

  function initialsFor(id?: string | null) {
    if (!id) return '?';
    return map[id]?.initials ?? '?';
  }

  return { map, label, initialsFor };
}
