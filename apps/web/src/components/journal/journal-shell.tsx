import Link from "next/link";
import { MarketingHeader } from "@/components/layout/marketing-header";
import { DISCORD_INVITE_URL } from "@/lib/community";

export function JournalShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--brand-paper-warm)] text-[var(--brand-ink)]">
      <MarketingHeader />
      <main className="px-5 pb-20 pt-[108px] md:pt-[120px]">{children}</main>
      <footer className="border-t border-[var(--brand-hairline)] px-5 py-10">
        <div className="mx-auto flex max-w-[960px] flex-wrap items-center justify-between gap-4">
          <p className="font-display text-[18px] font-bold tracking-tight">Brigade</p>
          <nav className="flex flex-wrap gap-x-5 gap-y-2 text-[14px] text-[var(--brand-ink-muted)]">
            <Link href="/journal" className="hover:text-[var(--brand-ink)]">
              Journal
            </Link>
            <Link href="/accelerator" className="hover:text-[var(--brand-ink)]">
              Accelerator
            </Link>
            <Link href="/apply" className="hover:text-[var(--brand-ink)]">
              Apply
            </Link>
            <a
              href={DISCORD_INVITE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[var(--brand-ink)]"
            >
              Discord
            </a>
          </nav>
        </div>
        <p className="mx-auto mt-4 max-w-[960px] text-[12px] text-[var(--brand-ink-subtle)]">
          © {new Date().getFullYear()} Brigade
        </p>
      </footer>
    </div>
  );
}
