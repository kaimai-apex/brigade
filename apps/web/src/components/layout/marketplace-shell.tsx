import { PublicNav } from '@/components/layout/public-nav';

type MarketplaceShellProps = {
  children: React.ReactNode;
  showAuth?: boolean;
};

/** ADPList-scoped shell: Circular type, white canvas, 72px header. */
export function MarketplaceShell({ children, showAuth = true }: MarketplaceShellProps) {
  return (
    <div className="adp-mk min-h-screen bg-white">
      <PublicNav showAuth={showAuth} />
      {children}
    </div>
  );
}
