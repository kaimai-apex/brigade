'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import {
  EXPERTISE_AREAS,
  PROFESSIONAL_ROLES,
  type Profile,
} from '@/lib/types/database';
import { displayName, formatLocation, getInitials } from '@/lib/utils';
import { resolveAvatarUrl } from '@/lib/avatars';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type DiscoverDirectoryProps = {
  profiles: Profile[];
};

export function DiscoverDirectory({ profiles }: DiscoverDirectoryProps) {
  const [query, setQuery] = useState('');
  const [role, setRole] = useState('');
  const [expertise, setExpertise] = useState('');
  const [openToWorkOnly, setOpenToWorkOnly] = useState(false);
  const [emergencyOnly, setEmergencyOnly] = useState(false);

  const rolesInUse = useMemo(() => {
    const set = new Set(profiles.map((p) => p.role).filter(Boolean) as string[]);
    const known = PROFESSIONAL_ROLES.filter((r) => set.has(r));
    const extras = [...set].filter(
      (r) => !(PROFESSIONAL_ROLES as readonly string[]).includes(r),
    );
    return [...known, ...extras];
  }, [profiles]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return profiles.filter((p) => {
      if (openToWorkOnly && !p.open_to_opportunities) return false;
      if (emergencyOnly && !p.available_emergency_staffing) return false;
      if (role && p.role !== role) return false;
      if (expertise && !(p.expertise_areas ?? []).includes(expertise)) return false;
      if (!q) return true;
      const hay = [
        p.first_name,
        p.last_name,
        p.headline,
        p.role,
        p.city,
        p.state,
        ...(p.expertise_areas ?? []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [profiles, query, role, expertise, openToWorkOnly, emergencyOnly]);

  return (
    <div>
      <Card className="mb-6 space-y-4 p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search bartenders, chefs, cities, specialties…"
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="h-9 rounded-md border border-neutral-200 bg-white px-3 text-sm"
            aria-label="Filter by role"
          >
            <option value="">All roles</option>
            {rolesInUse.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>

          <select
            value={expertise}
            onChange={(e) => setExpertise(e.target.value)}
            className="h-9 rounded-md border border-neutral-200 bg-white px-3 text-sm"
            aria-label="Filter by specialty"
          >
            <option value="">All specialties</option>
            {EXPERTISE_AREAS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setOpenToWorkOnly((v) => !v)}
            className={cn(
              'h-9 rounded-full border px-3 text-sm font-semibold transition',
              openToWorkOnly
                ? 'border-forest bg-forest text-white'
                : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50',
            )}
          >
            Open to work
          </button>
          <button
            type="button"
            onClick={() => setEmergencyOnly((v) => !v)}
            className={cn(
              'h-9 rounded-full border px-3 text-sm font-semibold transition',
              emergencyOnly
                ? 'border-rust bg-rust text-white'
                : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50',
            )}
          >
            Emergency shifts
          </button>

          {(query || role || expertise || openToWorkOnly || emergencyOnly) && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9"
              onClick={() => {
                setQuery('');
                setRole('');
                setExpertise('');
                setOpenToWorkOnly(false);
                setEmergencyOnly(false);
              }}
            >
              Clear
            </Button>
          )}
        </div>

        <p className="text-xs text-neutral-500">
          {filtered.length} of {profiles.length} professionals
        </p>
      </Card>

      {filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="font-display text-2xl font-bold">No matches</p>
          <p className="mt-3 text-ink/65">
            Try a different role or specialty — or clear filters to see everyone.
          </p>
        </Card>
      ) : (
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((profile) => (
            <li key={profile.id}>
              <Link href={`/profile/${profile.id}`} className="group block h-full">
                <Card className="h-full transition group-hover:-translate-y-1 group-hover:shadow-lg">
                  <div className="flex items-start gap-4">
                    <div className="relative shrink-0">
                      <Avatar
                        className={cn(
                          'size-14 border border-neutral-200',
                          profile.open_to_opportunities &&
                            'ring-2 ring-forest ring-offset-2',
                        )}
                      >
                        <AvatarImage
                          src={resolveAvatarUrl(
                            profile.profile_image_url,
                            profile.id,
                          )}
                          alt={displayName(profile.first_name, profile.last_name)}
                          className="object-cover"
                        />
                        <AvatarFallback className="bg-secondary text-base font-bold text-forest">
                          {getInitials(profile.first_name, profile.last_name)}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold uppercase tracking-wide text-forest">
                        {profile.role}
                      </p>
                      <h2 className="font-display text-xl font-bold leading-tight group-hover:text-forest">
                        {displayName(profile.first_name, profile.last_name)}
                      </h2>
                      <p className="mt-1 text-sm text-ink/60">
                        {formatLocation(profile.city, profile.state, profile.country)}
                      </p>
                    </div>
                  </div>

                  {profile.headline && (
                    <p className="mt-4 line-clamp-2 text-sm leading-relaxed text-ink/75">
                      {profile.headline}
                    </p>
                  )}

                  {profile.expertise_areas && profile.expertise_areas.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {profile.expertise_areas.slice(0, 3).map((area) => (
                        <Badge key={area} variant="secondary">
                          {area}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {(profile.open_to_opportunities ||
                    profile.available_emergency_staffing ||
                    profile.available_private_events) && (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {profile.open_to_opportunities && (
                        <Badge className="bg-forest text-white">Open to work</Badge>
                      )}
                      {profile.available_emergency_staffing && (
                        <Badge variant="outline" className="border-rust text-rust">
                          Emergency shifts
                        </Badge>
                      )}
                      {profile.available_private_events && (
                        <Badge variant="outline">Private events</Badge>
                      )}
                    </div>
                  )}
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
