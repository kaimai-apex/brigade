import Link from "next/link";

export function SiteHeader({ showAuth = true }: { showAuth?: boolean }) {
  return (
    <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
      <Link href="/" className="font-display text-2xl font-black tracking-tight">
        Brigade
      </Link>
      <nav className="flex items-center gap-4 text-sm font-semibold">
        <Link href="/directory" className="opacity-75 transition hover:opacity-100">
          Directory
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
