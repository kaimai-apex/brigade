'use client';

import { useEffect } from 'react';
import { api } from '@/lib/api/client';

/**
 * Records a profile view when a non-owner opens a profile (LinkedIn's
 * "who viewed your profile"). Renders nothing; the server skips self-views too.
 */
export function ProfileViewRecorder({
  profileId,
  isOwner,
}: {
  profileId: string;
  isOwner: boolean;
}) {
  useEffect(() => {
    if (isOwner) return;
    api.recordProfileView(profileId).catch(() => {
      /* view tracking is best-effort */
    });
  }, [profileId, isOwner]);

  return null;
}
