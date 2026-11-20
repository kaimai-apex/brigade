import Link from "next/link";
import { MarketingHeader } from "@/components/layout/marketing-header";
import { SiteFooter } from "@/components/layout/site-footer";

/**
 * Branded 404 page for unknown routes and profile IDs.
 * Matches Brigade's warm, editorial design.
 */
export default function NotFound() {
  return (
    <div className="adp-mk min-h-screen overflow-x-hidden bg-white">
      <MarketingHeader />
      <main className="flex min-h-[70vh] flex-col items-center justify-center px-4 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="font-display text-6xl font-semibold text-ink sm:text-7xl">
            404
          </h1>
          <p className="mt-6 font-display text-2xl text-ink/80 sm:text-3xl">
            Page not found
          </p>
          <p className="mt-4 text-lg text-ink/65">
            The page you&rsquo;re looking for doesn&rsquo;t exist or has been moved.
          </p>
          <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-full bg-forest px-8 py-3 font-medium text-cream transition-colors hover:bg-forest/90"
            >
              Go home
            </Link>
            <Link
              href="/mentors"
              className="inline-flex items-center justify-center rounded-full border border-ink/20 px-8 py-3 font-medium text-ink transition-colors hover:border-ink/40 hover:bg-cream/50"
            >
              Find a mentor
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter signedIn={false} />
    </div>
  );
}
