import Link from "next/link";
import { BrandLink } from "@/components/brand/brand-mark";

export default function BookThanksPage() {
  return (
    <div className="min-h-dvh bg-[var(--brand-paper-warm)] text-[var(--brand-ink)]">
      <header className="flex h-14 items-center border-b border-black/8 px-5">
        <BrandLink markSize={24} className="text-xl" />
      </header>
      <main className="mx-auto max-w-lg px-5 py-20 text-center">
        <h1 className="text-[36px] font-semibold leading-tight">You&apos;re booked in</h1>
        <p className="mx-auto mt-4 max-w-[40ch] text-[17px] leading-relaxed text-[var(--brand-ink-muted)]">
          Payment went through. Check your email for the Stripe receipt — we&apos;ll
          follow up shortly to lock a time for the call.
        </p>
        <Link
          href="/"
          className="mt-10 inline-flex h-11 items-center justify-center rounded-xl bg-[var(--mk-ink)] px-6 text-[15px] font-semibold text-white"
        >
          Back home
        </Link>
      </main>
    </div>
  );
}
