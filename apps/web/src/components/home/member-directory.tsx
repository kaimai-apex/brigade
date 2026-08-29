import { RailCard } from "@/components/mentorship/mentor-card";
import type { MentorListing } from "@/lib/server/mentorship-db";

/** Single homepage directory — every member, no category rails or filters. */
export function HomeMemberDirectory({ members }: { members: MentorListing[] }) {
  if (members.length === 0) return null;

  return (
    <section className="mk-shell py-12 md:py-16">
      <h2 className="mk-rail-title">Chefs already on this path</h2>
      <ul className="mt-6 grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 sm:gap-x-4 sm:gap-y-8 md:grid-cols-4 xl:grid-cols-5">
        {members.map((member) => (
          <li key={member.userId}>
            <RailCard mentor={member} className="w-full shrink" />
          </li>
        ))}
      </ul>
    </section>
  );
}
