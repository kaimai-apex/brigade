'use client';

import { MapPin } from 'lucide-react';
import type { Profile } from '@/lib/types/database';
import {
  cn,
  displayName,
  formatLocation,
  getInitials,
  relativeTime,
} from '@/lib/utils';
import { resolveAvatarUrl } from '@/lib/avatars';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { InviteButton } from '@/components/discover/invite-button';
import { SaveButton } from '@/components/directory/save-button';

export function DirectoryCard({
  profile,
  saved,
  onQuickLook,
}: {
  profile: Profile;
  saved: boolean;
  onQuickLook: (p: Profile) => void;
}) {
  const name = displayName(profile.first_name, profile.last_name);
  const location = formatLocation(profile.city, profile.state, profile.country);
  const chips = (profile.expertise_areas ?? []).slice(0, 3);
  const extra = (profile.expertise_areas?.length ?? 0) - chips.length;

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white transition-shadow hover:shadow-md">
      {/* Photo — the catalog's focal point. Whole area opens quick-look.
          A div (not <button>) so the SaveButton can nest without invalid HTML. */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => onQuickLook(profile)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onQuickLook(profile);
          }
        }}
        className="relative block aspect-[4/3] w-full cursor-pointer overflow-hidden bg-secondary/40 text-left"
        aria-label={`Quick look at ${name}`}
      >
        <Avatar className="size-full rounded-none">
          <AvatarImage
            src={resolveAvatarUrl(profile.profile_image_url, profile.id)}
            alt={name}
            className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
          <AvatarFallback className="size-full rounded-none bg-secondary text-2xl font-bold text-forest">
            {getInitials(profile.first_name, profile.last_name)}
          </AvatarFallback>
        </Avatar>
        {profile.open_to_opportunities && (
          <span className="absolute left-2 top-2 rounded-full bg-forest px-2 py-0.5 text-[11px] font-semibold text-white">
            Open to work
          </span>
        )}
        <div className="absolute right-2 top-2">
          <SaveButton userId={profile.id} name={name} initialSaved={saved} />
        </div>
      </div>

      <div className="flex flex-1 flex-col p-3">
        <p className="text-[10px] font-bold uppercase tracking-wide text-forest">
          {profile.role}
        </p>
        <button
          type="button"
          onClick={() => onQuickLook(profile)}
          className="truncate text-left text-[16px] font-semibold leading-tight hover:underline"
        >
          {name}
        </button>
        {location && (
          <p className="mt-0.5 flex items-center gap-1 truncate text-meta text-ink/60">
            <MapPin className="size-3 shrink-0" />
            {location}
          </p>
        )}
        {profile.headline && (
          <p className="mt-1 line-clamp-2 text-body-md text-ink/70">
            {profile.headline}
          </p>
        )}

        {(chips.length > 0 || profile.available_emergency_staffing) && (
          <div className="mt-2 flex flex-wrap gap-1">
            {profile.available_emergency_staffing && (
              <Badge variant="outline" className="border-rust text-[11px] text-rust">
                Emergency shifts
              </Badge>
            )}
            {chips.map((chip) => (
              <Badge key={chip} variant="secondary" className="text-[11px]">
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

        <div className="mt-3 flex items-center justify-between gap-2 border-t border-neutral-100 pt-2">
          <span className="truncate text-[11px] text-ink/45">
            {profile.created_at ? `Joined ${relativeTime(profile.created_at)}` : ''}
          </span>
          <InviteButton userId={profile.id} name={name} />
        </div>
      </div>
    </div>
  );
}

/** Dense Craigslist-style row for the list view. */
export function DirectoryRow({
  profile,
  saved,
  onQuickLook,
}: {
  profile: Profile;
  saved: boolean;
  onQuickLook: (p: Profile) => void;
}) {
  const name = displayName(profile.first_name, profile.last_name);
  const location = formatLocation(profile.city, profile.state, profile.country);
  const chips = (profile.expertise_areas ?? []).slice(0, 2);

  return (
    <div className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-3 transition-colors hover:bg-neutral-50">
      <button
        type="button"
        onClick={() => onQuickLook(profile)}
        className="shrink-0"
        aria-label={`Quick look at ${name}`}
      >
        <Avatar
          className={cn(
            'size-12 border border-neutral-200',
            profile.open_to_opportunities && 'ring-2 ring-forest ring-offset-1',
          )}
        >
          <AvatarImage
            src={resolveAvatarUrl(profile.profile_image_url, profile.id)}
            alt={name}
            className="object-cover"
          />
          <AvatarFallback className="bg-secondary text-sm font-bold text-forest">
            {getInitials(profile.first_name, profile.last_name)}
          </AvatarFallback>
        </Avatar>
      </button>

      <button
        type="button"
        onClick={() => onQuickLook(profile)}
        className="min-w-0 flex-1 text-left"
      >
        <p className="text-[10px] font-bold uppercase tracking-wide text-forest">
          {profile.role}
        </p>
        <p className="truncate text-[15px] font-semibold leading-tight hover:underline">
          {name}
        </p>
        <p className="truncate text-meta text-ink/60">
          {location || '—'}
          {chips.length > 0 && ` · ${chips.join(' · ')}`}
        </p>
      </button>

      <div className="flex shrink-0 items-center gap-2">
        <SaveButton userId={profile.id} name={name} initialSaved={saved} />
        <InviteButton userId={profile.id} name={name} />
      </div>
    </div>
  );
}
