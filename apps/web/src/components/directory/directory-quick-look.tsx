'use client';

import Link from 'next/link';
import { MapPin, MessageSquare } from 'lucide-react';
import type { Profile } from '@/lib/types/database';
import { displayName, formatLocation, getInitials } from '@/lib/utils';
import { resolveAvatarUrl } from '@/lib/avatars';
import { AVAILABILITY_LABELS } from '@/lib/types/database';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { InviteButton } from '@/components/discover/invite-button';
import { SaveButton } from '@/components/directory/save-button';

const AVAILABILITY_FLAGS: { key: keyof typeof AVAILABILITY_LABELS; field: keyof Profile }[] = [
  { key: 'open_to_opportunities', field: 'open_to_opportunities' },
  { key: 'available_private_events', field: 'available_private_events' },
  { key: 'available_contract_work', field: 'available_contract_work' },
  { key: 'available_emergency_staffing', field: 'available_emergency_staffing' },
];

/** Marketplace-style quick look — preview a member without leaving the catalog. */
export function DirectoryQuickLook({
  profile,
  saved,
  open,
  onOpenChange,
}: {
  profile: Profile | null;
  saved: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!profile) return null;
  const name = displayName(profile.first_name, profile.last_name);
  const location = formatLocation(profile.city, profile.state, profile.country);
  const availability = AVAILABILITY_FLAGS.filter(({ field }) => profile[field]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 overflow-hidden p-0">
        <div className="relative aspect-[16/9] w-full bg-secondary/40">
          <Avatar className="size-full rounded-none">
            <AvatarImage
              src={resolveAvatarUrl(profile.profile_image_url, profile.id)}
              alt={name}
              className="size-full object-cover"
            />
            <AvatarFallback className="size-full rounded-none bg-secondary text-4xl font-bold text-forest">
              {getInitials(profile.first_name, profile.last_name)}
            </AvatarFallback>
          </Avatar>
          <div className="absolute right-3 top-3">
            <SaveButton userId={profile.id} name={name} initialSaved={saved} />
          </div>
        </div>

        <div className="p-5">
          <DialogHeader className="space-y-1 text-left">
            <p className="text-[11px] font-bold uppercase tracking-wide text-forest">
              {profile.role}
              {typeof profile.years_experience === 'number' &&
                profile.years_experience > 0 &&
                ` · ${profile.years_experience} yrs`}
            </p>
            <DialogTitle className="text-xl">{name}</DialogTitle>
          </DialogHeader>

          {location && (
            <p className="mt-1 flex items-center gap-1 text-meta text-ink/60">
              <MapPin className="size-3.5" />
              {location}
            </p>
          )}
          {profile.headline && (
            <p className="mt-3 text-body-md text-ink/80">{profile.headline}</p>
          )}

          {availability.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {availability.map(({ key }) => (
                <Badge
                  key={key}
                  variant="outline"
                  className="border-forest/30 bg-forest/5 text-[11px] text-forest"
                >
                  {AVAILABILITY_LABELS[key]}
                </Badge>
              ))}
            </div>
          )}

          {(profile.expertise_areas?.length ?? 0) > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {profile.expertise_areas!.map((a) => (
                <Badge key={a} variant="secondary" className="text-[11px]">
                  {a}
                </Badge>
              ))}
            </div>
          )}

          <div className="mt-5 flex items-center gap-2">
            <div className="flex-1">
              <InviteButton userId={profile.id} name={name} />
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href={`/messages?to=${profile.id}`}>
                <MessageSquare className="size-4" /> Message
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href={`/profile/${profile.id}`}>View profile</Link>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
