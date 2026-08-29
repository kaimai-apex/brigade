import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export const APPLY_CTA_LABEL = "Join The Next Brigade Cohort";

export function ApplyButton({
  className,
  children = APPLY_CTA_LABEL,
  light = false,
}: {
  className?: string;
  children?: ReactNode;
  light?: boolean;
}) {
  return (
    <Link
      href="/apply"
      className={cn(
        "inline-flex h-12 w-full items-center justify-center gap-2 rounded-full px-6 text-[15px] font-semibold transition hover:scale-[1.02] sm:w-auto",
        light
          ? "bg-[var(--mk-surface)] text-[var(--mk-ink)] hover:bg-[var(--mk-surface)]/90"
          : "bg-[var(--mk-ink)] text-[var(--brand-white)]",
        className,
      )}
    >
      {children}
      <ArrowRight className="size-4" aria-hidden />
    </Link>
  );
}
