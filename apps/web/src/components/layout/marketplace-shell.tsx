import { Suspense } from 'react';
import { WelcomeBanner } from '@/components/auth/welcome-banner';
import { PageHeader } from '@/components/layout/app-shell';

type MarketplaceShellProps = {
  children: React.ReactNode;
  showAuth?: boolean;
};

/** ADPList-scoped shell: Circular type, white canvas, 72px header. */
export function MarketplaceShell({ children, showAuth = true }: MarketplaceShellProps) {
  return (
    <div className="adp-mk min-h-screen bg-white">
      <PageHeader showAuth={showAuth} />
      <Suspense fallback={null}>
        <WelcomeBanner />
      </Suspense>
      {children}
    </div>
  );
}
