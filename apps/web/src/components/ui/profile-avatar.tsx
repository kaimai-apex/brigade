'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { resolveAvatarUrl } from '@/lib/avatars';
import { cn, getInitials } from '@/lib/utils';

type ProfileAvatarProps = {
  src?: string | null;
  /** Stable id (userId / email) so the kitchen default stays consistent */
  seed?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  alt?: string;
  className?: string;
  size?: 'default' | 'sm' | 'lg';
  fallbackClassName?: string;
};

/**
 * Always shows an image: uploaded photo, or auto-assigned kitchen art.
 */
export function ProfileAvatar({
  src,
  seed,
  firstName,
  lastName,
  alt,
  className,
  size = 'default',
  fallbackClassName,
}: ProfileAvatarProps) {
  const url = resolveAvatarUrl(src, seed ?? firstName ?? lastName);
  const label = alt ?? ([firstName, lastName].filter(Boolean).join(' ') || 'Member');
  const initials = getInitials(firstName, lastName);

  return (
    <Avatar size={size} className={cn('border border-neutral-200', className)}>
      <AvatarImage src={url} alt={label} className="object-cover" />
      <AvatarFallback className={cn('bg-neutral-100 font-semibold text-forest', fallbackClassName)}>
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
