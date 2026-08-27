import type { ReactNode } from "react";
import { DISCORD_INVITE_URL } from "@/lib/community";
import { cn } from "@/lib/utils";

export function JoinDiscordButton({
  className,
  children = "Join Discord",
  light = false,
}: {
  className?: string;
  children?: ReactNode;
  light?: boolean;
}) {
  return (
    <a
      href={DISCORD_INVITE_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 text-[15px] font-semibold transition hover:scale-[1.02]",
        light
          ? "text-[var(--brand-white)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.8)] hover:bg-[var(--mk-surface)]/10"
          : "text-[var(--brand-ink)] shadow-[inset_0_0_0_1px_rgba(26,26,23,0.18)] hover:bg-black/5",
        className,
      )}
    >
      {children}
    </a>
  );
}
