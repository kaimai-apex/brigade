'use client';

import { useState } from 'react';
import { BannerPicker } from '@/components/profile/banner-picker';
import { PROFILE_BANNERS } from '@/lib/banners';

type BannerFieldProps = {
  defaultValue?: string | null;
};

export function BannerField({ defaultValue }: BannerFieldProps) {
  const initial =
    PROFILE_BANNERS.find((b) => b.id === defaultValue || b.src === defaultValue)?.id ??
    PROFILE_BANNERS[0].id;
  const [value, setValue] = useState(initial);

  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-ink/80">Profile banner</p>
      <p className="mb-3 text-xs text-ink/55">
        Pick a kitchen or venue scene for your cover — you can change this anytime.
      </p>
      <BannerPicker value={value} onChange={setValue} />
    </div>
  );
}
