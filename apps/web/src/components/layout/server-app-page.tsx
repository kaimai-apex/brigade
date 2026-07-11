import { cn } from '@/lib/utils';
import { SiteHeader } from '@/components/layout/site-header';

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
  );
}
