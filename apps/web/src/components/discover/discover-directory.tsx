'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ChevronDown, Search } from 'lucide-react';
import {
  EXPERTISE_AREAS,
  PROFESSIONAL_ROLES,
  type Profile,
} from '@/lib/types/database';
import { displayName, formatLocation, getInitials } from '@/lib/utils';
import { resolveAvatarUrl } from '@/lib/avatars';
import { InviteButton } from '@/components/discover/invite-button';
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
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState(() => searchParams.get('q') ?? '');
  const [role, setRole] = useState('');
  const [expertise, setExpertise] = useState('');
  const [openToWorkOnly, setOpenToWorkOnly] = useState(false);
  const [emergencyOnly, setEmergencyOnly] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);
  const [expertiseOpen, setExpertiseOpen] = useState(false);

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) setQuery(q);
    if (searchParams.get('focus') === '1' || q) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [searchParams]);

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
      <div className="mb-3 space-y-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search people, roles, cities"
            className="h-12 pl-9"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => {
                setRoleOpen((v) => !v);
                setExpertiseOpen(false);
              }}
              className={cn(
                'touch-compact flex h-9 items-center gap-1 rounded-full border px-3 text-sm font-semibold whitespace-nowrap',
                role
                  ? 'border-forest bg-forest text-white'
                  : 'border-neutral-200 bg-white text-neutral-700',
              )}
            >
              {role || 'Roles'} <ChevronDown className="size-3.5" />
            </button>
            {roleOpen && (
              <div className="absolute left-0 top-10 z-20 max-h-56 w-44 overflow-auto rounded-xl border border-neutral-200 bg-white py-1 shadow-lg">
                <button
                  type="button"
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-neutral-50"
                  onClick={() => {
                    setRole('');
                    setRoleOpen(false);
                  }}
                >
                  All roles
                </button>
                {rolesInUse.map((r) => (
                  <button
                    key={r}
                    type="button"
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-neutral-50"
                    onClick={() => {
                      setRole(r);
                      setRoleOpen(false);
                    }}
                  >
                    {r}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => {
                setExpertiseOpen((v) => !v);
                setRoleOpen(false);
              }}
              className={cn(
                'touch-compact flex h-9 items-center gap-1 rounded-full border px-3 text-sm font-semibold whitespace-nowrap',
                expertise
                  ? 'border-forest bg-forest text-white'
                  : 'border-neutral-200 bg-white text-neutral-700',
              )}
            >
              {expertise || 'Specialties'} <ChevronDown className="size-3.5" />
            </button>
            {expertiseOpen && (
              <div className="absolute left-0 top-10 z-20 max-h-56 w-48 overflow-auto rounded-xl border border-neutral-200 bg-white py-1 shadow-lg">
                <button
                  type="button"
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-neutral-50"
                  onClick={() => {
                    setExpertise('');
                    setExpertiseOpen(false);
                  }}
                >
                  All specialties
                </button>
                {EXPERTISE_AREAS.map((a) => (
                  <button
                    key={a}
                    type="button"
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-neutral-50"
                    onClick={() => {
                      setExpertise(a);
                      setExpertiseOpen(false);
                    }}
                  >
                    {a}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setOpenToWorkOnly((v) => !v)}
            className={cn(
              'touch-compact h-9 shrink-0 rounded-full border px-3 text-sm font-semibold whitespace-nowrap',
              openToWorkOnly
                ? 'border-forest/40 bg-forest/10 text-forest'
                : 'border-neutral-200 bg-white text-neutral-700',
            )}
          >
            Open to work
          </button>
          <button
            type="button"
            onClick={() => setEmergencyOnly((v) => !v)}
            className={cn(
              'touch-compact h-9 shrink-0 rounded-full border px-3 text-sm font-semibold whitespace-nowrap',
              emergencyOnly
                ? 'border-rust bg-rust/10 text-rust'
                : 'border-neutral-200 bg-white text-neutral-700',
            )}
          >
            Emergency shifts
          </button>
        </div>

        {(query || role || expertise || openToWorkOnly || emergencyOnly) && (
          <p className="text-meta text-neutral-500">
            {filtered.length} of {profiles.length} professionals
          </p>
        )}
      </div>

      {filtered.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="text-section-title">No matches</p>
          <p className="mt-2 text-body-md text-ink/65">
            Try a different role or specialty — or clear filters.
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-4"
            onClick={() => {
              setQuery('');
              setRole('');
              setExpertise('');
              setOpenToWorkOnly(false);
              setEmergencyOnly(false);
            }}
          >
            Clear filters
          </Button>
        </Card>
      ) : (
        <ul className="space-y-3">
          {filtered.map((profile) => {
            const chips = [
              ...(profile.expertise_areas ?? []).slice(0, 2),
              profile.open_to_opportunities ? 'Open to work' : null,
              profile.available_emergency_staffing ? 'Emergency shifts' : null,
            ].filter(Boolean) as string[];
            const extra =
              (profile.expertise_areas?.length ?? 0) -
              Math.min(2, profile.expertise_areas?.length ?? 0);

            return (
              <li key={profile.id}>
                <Card className="p-3">
                  <div className="flex items-start gap-3">
                    <Link href={`/profile/${profile.id}`} className="shrink-0">
                      <Avatar
                        className={cn(
                          'size-12 border border-neutral-200',
                          profile.open_to_opportunities &&
                            'ring-2 ring-forest ring-offset-1',
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
                        <AvatarFallback className="bg-secondary text-sm font-bold text-forest">
                          {getInitials(profile.first_name, profile.last_name)}
                        </AvatarFallback>
                      </Avatar>
                    </Link>

                    <Link href={`/profile/${profile.id}`} className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-forest">
                        {profile.role}
                      </p>
                      <h2 className="truncate text-[17px] font-semibold leading-tight">
                        {displayName(profile.first_name, profile.last_name)}
                      </h2>
                      <p className="truncate text-meta text-ink/60">
                        {formatLocation(profile.city, profile.state, profile.country) ||
                          '—'}
                      </p>
                      {profile.headline && (
                        <p className="mt-1 truncate text-body-md text-ink/70">
                          {profile.headline}
                        </p>
                      )}
                      {chips.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {chips.slice(0, 3).map((chip) => (
                            <Badge
                              key={chip}
                              variant="outline"
                              className={cn(
                                'text-[11px]',
                                chip === 'Emergency shifts' &&
                                  'border-rust text-rust',
                                chip === 'Open to work' &&
                                  'border-forest/30 bg-forest/10 text-forest',
                              )}
                            >
                              {chip}
                            </Badge>
                          ))}
                          {extra > 0 && (
                            <Badge variant="secondary" className="text-[11px]">
                              +{extra}
                            </Badge>
                          )}
                        </div>
                      )}
                    </Link>

                    <InviteButton
                      userId={profile.id}
                      name={displayName(profile.first_name, profile.last_name)}
                    />
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
