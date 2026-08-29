import { MarketingHeader } from "@/components/layout/marketing-header";
import { SiteFooter } from "@/components/layout/site-footer";

export function JournalShell({
  children,
  signedIn = false,
}: {
  children: React.ReactNode;
  signedIn?: boolean;
}) {
  return (
    <div className="min-h-screen bg-[var(--brand-paper-warm)] text-[var(--brand-ink)]">
      <MarketingHeader />
      <main className="px-4 pb-24 pt-[88px] md:px-5 md:pt-[120px]">{children}</main>
      <SiteFooter signedIn={signedIn} />
    </div>
  );
}
