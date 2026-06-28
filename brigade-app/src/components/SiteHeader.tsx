import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="bg-forest text-cream sticky top-0 z-20 border-b border-brass-bright/30">
      <div className="mx-auto max-w-6xl px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="inline-grid place-items-center h-9 w-9 rounded-sm bg-brass-bright text-forest-deep font-display font-bold text-lg">
            B
          </span>
          <span className="font-display text-2xl tracking-wide">Brigade</span>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-4 font-sans text-xs uppercase tracking-[0.14em]">
          <Link href="/chefs" className="px-2 py-2 text-cream/85 hover:text-brass-bright transition">
            Find a chef
          </Link>
          <Link href="/dashboard" className="px-2 py-2 text-cream/85 hover:text-brass-bright transition hidden sm:inline">
            Dashboard
          </Link>
          <Link href="/admin" className="px-2 py-2 text-cream/85 hover:text-brass-bright transition hidden sm:inline">
            Admin
          </Link>
          <Link href="/signup" className="btn btn-accent ml-1 px-4 py-2">
            Join as a chef
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-auto bg-forest-deep text-cream/80">
      <div className="mx-auto max-w-6xl px-4 pt-8 pb-10">
        <div className="rule-gold mb-6 opacity-60" />
        <div className="text-sm flex flex-col sm:flex-row gap-4 justify-between items-start">
          <div className="max-w-md">
            <p className="font-display text-xl text-cream tracking-wide">Brigade</p>
            <p className="mt-1 text-cream/70">
              The professional home for private chefs. We never take a cut of the
              meal.
            </p>
          </div>
          <nav className="flex gap-5 font-sans text-xs uppercase tracking-[0.14em]">
            <Link href="/chefs" className="hover:text-brass-bright">Directory</Link>
            <Link href="/signup" className="hover:text-brass-bright">For chefs</Link>
            <Link href="/dashboard" className="hover:text-brass-bright">Tools</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
