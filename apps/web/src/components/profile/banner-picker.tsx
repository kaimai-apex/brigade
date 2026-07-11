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
    <div className={cn('space-y-3', className)}>
      <input type="hidden" name={name} value={value} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {PROFILE_BANNERS.map((banner) => {
          const selected = value === banner.id || value === banner.src;
          return (
            <button
              key={banner.id}
              type="button"
              onClick={() => onChange(banner.id)}
              className={cn(
                'group overflow-hidden rounded-lg border-2 text-left transition',
                selected
                  ? 'border-forest ring-2 ring-forest/30'
                  : 'border-neutral-200 hover:border-neutral-400',
              )}
            >
              <div
                className="aspect-[16/7] bg-cover bg-center"
                style={{ backgroundImage: `url(${banner.src})` }}
              />
              <div className="bg-white px-2 py-1.5">
                <p className="truncate text-xs font-semibold text-ink">{banner.label}</p>
                <p className="truncate text-[10px] text-neutral-500">{banner.description}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
