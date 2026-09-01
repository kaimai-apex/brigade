import { cn } from '@/lib/utils';
import { SiteHeader } from '@/components/layout/site-header';
import { NAV_OFFSET_CLASS } from '@/lib/nav';

type ServerAppPageProps = {
  children: React.ReactNode;
  className?: string;
  showAuth?: boolean;
  wide?: boolean;
};

/** White page shell for React Server Components */
export function ServerAppPage({
  children,
  className,
  showAuth = true,
  wide = false,
}: ServerAppPageProps) {
  return (
    <div className="min-h-screen bg-white text-ink">
      <SiteHeader showAuth={showAuth} />
      <div className={NAV_OFFSET_CLASS}>
      <div
        className={cn(
          'mx-auto px-4 py-6',
          wide ? 'max-w-6xl' : 'max-w-[1128px]',
          className,
        )}
      >
        {children}
      </div>
      </div>
    </div>
  );
}
