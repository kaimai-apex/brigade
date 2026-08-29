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
      <main className="px-5 pb-20 pt-[108px] md:pt-[120px]">{children}</main>
      <SiteFooter signedIn={signedIn} />
    </div>
  );
}
