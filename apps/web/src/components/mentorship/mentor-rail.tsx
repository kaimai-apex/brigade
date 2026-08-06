import Link from "next/link";
import { ScrollRail } from "@/components/mentorship/scroll-rail";
import { RailCard } from "@/components/mentorship/mentor-card";
import type { MentorListing } from "@/lib/server/mentorship-db";

/** ADPList "Popular in …" band — 23px title, Show all, horizontal rail. */
export function MentorRail({
  title,
  expertise,
  mentors,
}: {
  title: string;
  expertise: string;
  mentors: MentorListing[];
}) {
  if (mentors.length === 0) return null;

  const href = `/mentors?expertise=${encodeURIComponent(expertise)}`;

  return (
    <section className="py-10">
      <div className="mb-5 flex items-baseline justify-between gap-4">
        <h2 className="mk-rail-title">{title}</h2>
        <Link
          href={href}
          className="shrink-0 text-[14px] font-medium text-[var(--mk-muted)] hover:text-[var(--mk-text)]"
        >
          Show all
        </Link>
      </div>

      <ScrollRail>
        {mentors.map((m) => (
          <RailCard key={m.userId} mentor={m} />
        ))}
      </ScrollRail>
    </section>
  );
}
