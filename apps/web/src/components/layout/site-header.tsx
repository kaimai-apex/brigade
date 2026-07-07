import Link from "next/link";

export function SiteHeader({ showAuth = true }: { showAuth?: boolean }) {
  return (
    <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
      <Link href="/" className="font-display text-2xl font-black tracking-tight">
        Brigade
      </Link>
      <nav className="flex flex-wrap items-center gap-4 text-sm font-semibold">
        <Link href="/dashboard" className="opacity-75 transition hover:opacity-100">
          Dashboard
        </Link>
        <Link href="/directory" className="opacity-75 transition hover:opacity-100">
          Directory
        </Link>
        <Link href="/feed" className="opacity-75 transition hover:opacity-100">
          Feed
        </Link>
        <Link href="/connections" className="opacity-75 transition hover:opacity-100">
          Network
        </Link>
        <Link href="/companies" className="opacity-75 transition hover:opacity-100">
          Companies
        </Link>
        <Link href="/jobs" className="opacity-75 transition hover:opacity-100">
          Jobs
        </Link>
        <Link href="/messages" className="opacity-75 transition hover:opacity-100">
          Messages
        </Link>
        <Link href="/search" className="opacity-75 transition hover:opacity-100">
          Search
        </Link>
        <Link href="/notifications" className="opacity-75 transition hover:opacity-100">
          Alerts
        </Link>
        <Link href="/settings/notifications" className="opacity-75 transition hover:opacity-100">
          Settings
        </Link>
        {showAuth && (
          <>
            <Link href="/login" className="opacity-75 transition hover:opacity-100">
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-full bg-ink px-5 py-2.5 text-paper transition hover:-translate-y-0.5"
            >
              Join Brigade
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
