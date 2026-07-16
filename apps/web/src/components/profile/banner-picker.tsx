'use client';

import { PROFILE_BANNERS } from '@/lib/banners';
import { cn } from '@/lib/utils';

type BannerPickerProps = {
  value: string;
  onChange: (bannerId: string) => void;
  name?: string;
  className?: string;
};

export function BannerPicker({ value, onChange, name = 'cover_url', className }: BannerPickerProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <input type="hidden" name={name} value={value} />
      <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {PROFILE_BANNERS.map((banner) => {
          const selected = value === banner.id || value === banner.src;
          return (
            <button
              key={banner.id}
              type="button"
              onClick={() => onChange(banner.id)}
              aria-label={banner.label}
              className={cn(
                'touch-compact h-24 w-40 shrink-0 overflow-hidden rounded-xl border-2 bg-cover bg-center',
                selected
                  ? 'border-forest ring-2 ring-forest/30'
                  : 'border-neutral-200',
              )}
              style={{ backgroundImage: `url(${banner.src})` }}
            />
          );
        })}
      </div>
    </div>
  );
}
