import Link from "next/link";
import { BrandLink } from "@/components/brand/brand-mark";
import { AdminSignOut } from "@/components/admin/admin-actions";

export function AdminShell({
  email,
  children,
}: {
  email: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--brand-paper-warm)] text-[var(--brand-ink)]">
      <header className="border-b border-[var(--brand-hairline)] bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-4">
            <BrandLink markSize={28} />
            <nav className="flex items-center gap-4 text-[13px] font-semibold">
              <Link href="/admin" className="text-[var(--brand-forest)]">
                Emails
              </Link>
              <Link
                href="/admin/applications"
                className="text-[var(--brand-ink-muted)] hover:text-[var(--brand-ink)]"
              >
                Applications
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <p className="hidden text-[12px] text-[var(--brand-ink-subtle)] sm:block">
              {email}
            </p>
            <AdminSignOut />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
