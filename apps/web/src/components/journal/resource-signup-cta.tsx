import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function ResourceSignupCta({
  kicker = "JOIN THE COMMUNITY",
  heading,
  body,
  next,
  submitLabel = "Create a free account",
}: {
  kicker?: string;
  heading: string;
  body: string;
  next: string;
  submitLabel?: string;
}) {
  const signup = `/signup?next=${encodeURIComponent(next)}`;
  const login = `/login?next=${encodeURIComponent(next)}`;

  return (
    <div className="rounded-2xl bg-[var(--brand-cream)] px-5 py-6 md:px-7 md:py-8">
      <p className="text-[12px] font-semibold tracking-[0.08em] text-[var(--brand-forest)]">
        {kicker}
      </p>
      <h2 className="font-display mt-2 text-[22px] font-semibold tracking-tight md:text-[24px]">
        {heading}
      </h2>
      <p className="mt-2 text-[15px] leading-relaxed text-[var(--brand-ink-muted)]">
        {body}
      </p>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Link
          href={signup}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[var(--mk-ink)] px-6 text-[15px] font-semibold text-[var(--brand-white)] transition hover:scale-[1.02]"
        >
          {submitLabel}
          <ArrowRight className="size-4" aria-hidden />
        </Link>
        <Link
          href={login}
          className="inline-flex h-12 items-center justify-center px-2 text-[15px] font-semibold text-[var(--brand-forest)] underline-offset-2 hover:underline"
        >
          Log in
        </Link>
      </div>
    </div>
  );
}
