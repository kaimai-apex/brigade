import Link from "next/link";
import { DISCORD_INVITE_URL } from "@/lib/community";

/** Footnotes for marketing pages. Discord lives here, not in the hero or nav. */
export function SiteFooter({ signedIn = false }: { signedIn?: boolean }) {
  return (
    <footer className="border-t border-[var(--brand-hairline)] bg-[var(--brand-paper-warm)] px-5 py-10">
      <div className="mx-auto flex max-w-[960px] flex-wrap items-center justify-between gap-4">
        <p className="font-display text-[18px] font-bold tracking-tight">Brigade</p>
        <nav className="flex flex-wrap gap-x-5 gap-y-2 text-[14px] text-[var(--brand-ink-muted)]">
          <Link
            href={signedIn ? "/learn" : "/signup?next=%2Flearn"}
            className="hover:text-[var(--brand-ink)]"
          >
            Learn
          </Link>
          <Link href="/accelerator" className="hover:text-[var(--brand-ink)]">
            Accelerator
          </Link>
          <Link href="/apply" className="hover:text-[var(--brand-ink)]">
            Join The Next Brigade Cohort
          </Link>
          <a
            href={DISCORD_INVITE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[var(--brand-ink)]"
          >
            Join Discord
          </a>
        </nav>
      </div>
      <p className="mx-auto mt-4 max-w-[960px] text-[12px] text-[var(--brand-ink-subtle)]">
        © {new Date().getFullYear()} Brigade
      </p>
    </footer>
  );
}
