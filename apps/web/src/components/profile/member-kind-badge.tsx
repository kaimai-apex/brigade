import { GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Mentor or member, said the same way everywhere.
 *
 * Brigade has exactly two kinds of person and the product reads as one
 * undifferentiated directory without a consistent mark for the difference. The
 * mentor badge is deliberately the only gold thing on a card: gold means "this
 * person teaches here", and it means nothing else.
 *
 * A plain member gets no badge at all rather than a grey "Member" chip. Most
 * people in the directory are members, so a chip on all of them is noise that
 * makes the mentors harder to pick out — which is the one job this has.
 */

export type MemberKind = "mentor" | "member";

/** `paused` mentors still teach here; only `draft` is not yet a mentor. */
export function memberKindFor(mentorStatus?: string | null): MemberKind {
  return mentorStatus === "active" || mentorStatus === "paused" ? "mentor" : "member";
}

export function MentorBadge({
  className,
  size = "default",
}: {
  className?: string;
  size?: "default" | "sm";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-gold/50 bg-gold/15 font-bold uppercase tracking-wide text-gold-ink",
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]",
        className,
      )}
    >
      <GraduationCap
        className={size === "sm" ? "size-3" : "size-3.5"}
        aria-hidden
      />
      Mentor
    </span>
  );
}

/** Renders the badge for mentors and nothing at all for members. */
export function MemberKindBadge({
  kind,
  className,
  size = "default",
}: {
  kind: MemberKind;
  className?: string;
  size?: "default" | "sm";
}) {
  if (kind !== "mentor") return null;
  return <MentorBadge className={className} size={size} />;
}
