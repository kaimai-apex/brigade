import { MarketingHeader } from "@/components/layout/marketing-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { NAV_OFFSET_CLASS } from "@/lib/nav";
import { cn } from "@/lib/utils";

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
      <main className={cn("px-4 pb-24 md:px-5", NAV_OFFSET_CLASS)}>{children}</main>
      <SiteFooter signedIn={signedIn} />
    </div>
  );
}
