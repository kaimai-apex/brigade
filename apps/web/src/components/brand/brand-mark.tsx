import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';

/** Icon-only B mark variants — colors match `tokens.css` brand palette. */
export const BRAND_MARK = {
  cream: '/brand/brigade-B-cream-transparent.png',
  forest: '/brand/brigade-B-forest-transparent.png',
  gold: '/brand/brigade-B-gold-transparent.png',
  ink: '/brand/brigade-B-ink-transparent.png',
  rust: '/brand/brigade-B-rust-transparent.png',
  white: '/brand/brigade-B-white-transparent.png',
} as const;

export type BrandMarkVariant = keyof typeof BRAND_MARK;

type BrandMarkProps = {
  variant?: BrandMarkVariant;
  /** CSS px; rendered square. */
  size?: number;
  className?: string;
  priority?: boolean;
};

/** Stylized B mark. Pair with Fraunces “Brigade” text — this asset is icon-only. */
export function BrandMark({
  variant = 'forest',
  size = 28,
  className,
  priority = false,
}: BrandMarkProps) {
  return (
    <Image
      src={BRAND_MARK[variant]}
      alt=""
      width={size}
      height={size}
      priority={priority}
      className={cn('shrink-0 select-none', className)}
    />
  );
}

type BrandLinkProps = {
  href?: string;
  /** Light surfaces → forest; dark surfaces → cream or white. */
  mark?: BrandMarkVariant;
  markSize?: number;
  className?: string;
  /** Extra classes for the Fraunces wordmark span. */
  wordmarkClassName?: string;
  priority?: boolean;
};

/**
 * Home link: B mark + Fraunces “Brigade”. Use in headers / auth chrome.
 */
export function BrandLink({
  href = '/',
  mark = 'forest',
  markSize = 28,
  className,
  wordmarkClassName,
  priority = false,
}: BrandLinkProps) {
  return (
    <Link
      href={href}
      aria-label="Brigade home"
      className={cn(
        'inline-flex min-h-11 shrink-0 items-center gap-2 font-display font-black tracking-tight text-[var(--brand-ink)]',
        className,
      )}
    >
      <BrandMark variant={mark} size={markSize} priority={priority} />
      <span className={cn('leading-none', wordmarkClassName)}>Brigade</span>
    </Link>
  );
}
