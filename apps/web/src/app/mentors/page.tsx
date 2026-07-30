import Link from 'next/link';
import { ServerAppPage } from '@/components/layout/server-app-page';
import { getConnectProSession } from '@/lib/connectpro/server';
import { dbListMentors, dbGetMentor } from '@/lib/server/mentorship-db';
import { formatMoney } from '@/lib/mentorship/pricing';
import { MentorSearch } from '@/components/mentorship/mentor-search';
import { resolveAvatarUrl } from '@/lib/avatars';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function MentorsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const q = one(sp.q);
  const session = await getConnectProSession();

  const [{ data: mentors, total }, ownMentor] = await Promise.all([
    dbListMentors({ q, limit: 24 }),
    session ? dbGetMentor(session.userId) : Promise.resolve(null),
  ]);

  return (
    <ServerAppPage>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-hero">Mentorship</h1>
          <p className="mt-1 text-ink/60">
            Book time with private chefs and hospitality leaders. Learn from someone who has
            already done it.
          </p>
        </div>
        <Button asChild variant={ownMentor ? 'outline' : 'default'}>
          <Link href="/mentorship">
            {ownMentor ? 'Manage your sessions' : 'Become a mentor'}
          </Link>
        </Button>
      </div>

      <MentorSearch initialQuery={q ?? ''} />

      <p className="text-meta mt-4 text-ink/60">
        {total === 1 ? '1 mentor' : `${total} mentors`}
      </p>

      {mentors.length === 0 ? (
        <div className="mt-6 rounded-xl border border-ink/10 p-10 text-center">
          <h2 className="text-lg font-semibold">
            {q ? 'No mentors match that search' : 'No mentors yet'}
          </h2>
          <p className="mt-2 text-ink/60">
            {q
              ? 'Try a role, a city, or a name.'
              : 'Be the first — publish your sessions and start taking bookings.'}
          </p>
          {!q && (
            <Button asChild className="mt-4">
              <Link href="/mentorship">Become a mentor</Link>
            </Button>
          )}
        </div>
      ) : (
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {mentors.map((m) => {
            const name = [m.firstName, m.lastName].filter(Boolean).join(' ') || 'Brigade Member';
            const place = [m.city, m.state].filter(Boolean).join(', ');
            return (
              <li key={m.userId}>
                <Link
                  href={`/mentors/${m.userId}`}
                  className="flex h-full flex-col rounded-xl border border-ink/10 p-4 transition-shadow hover:shadow-md"
                >
                  <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={resolveAvatarUrl(m.avatarUrl, m.userId)}
                      alt=""
                      className="size-12 rounded-full object-cover"
                    />
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{name}</p>
                      {m.role && (
                        <p className="text-meta truncate uppercase text-forest">{m.role}</p>
                      )}
                    </div>
                  </div>

                  {m.headline && (
                    <p className="mt-3 line-clamp-2 text-sm text-ink/70">{m.headline}</p>
                  )}
                  {place && <p className="text-meta mt-2 text-ink/50">{place}</p>}

                  <div className="mt-auto flex items-baseline gap-1 pt-4">
                    <span className="text-meta text-ink/50">from</span>
                    <span className="font-semibold">
                      {m.fromPriceCents === null
                        ? '—'
                        : formatMoney(m.fromPriceCents, m.currency)}
                    </span>
                    <span className="text-meta text-ink/50">
                      · {m.sessionCount === 1 ? '1 session' : `${m.sessionCount} sessions`}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </ServerAppPage>
  );
}
