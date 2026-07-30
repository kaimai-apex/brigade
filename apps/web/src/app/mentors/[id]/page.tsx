import { notFound } from 'next/navigation';
import { ServerAppPage } from '@/components/layout/server-app-page';
import { getPool } from '@connectpro/common';
import { getConnectProSession } from '@/lib/connectpro/server';
import {
  dbGetMentor,
  dbListSessionTypes,
  dbListAvailabilityRules,
} from '@/lib/server/mentorship-db';
import { paymentsConfigured } from '@/lib/server/payments';
import { resolveAvatarUrl } from '@/lib/avatars';
import { BookingPanel } from '@/components/mentorship/booking-panel';

export const dynamic = 'force-dynamic';

export default async function MentorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getConnectProSession();

  const mentor = await dbGetMentor(id);
  // A draft profile is not published yet, so it should not be reachable by URL.
  if (!mentor || mentor.status === 'draft') notFound();

  const [sessionTypes, rules, profileRes] = await Promise.all([
    dbListSessionTypes(id),
    dbListAvailabilityRules(id),
    getPool().query(
      `SELECT first_name, last_name, headline, role, city, state, country, avatar_url, about
       FROM users.profiles WHERE user_id = $1`,
      [id],
    ),
  ]);

  const profile = profileRes.rows[0];
  if (!profile) notFound();

  const name =
    [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Brigade Member';
  const place = [profile.city, profile.state, profile.country].filter(Boolean).join(', ');
  const isSelf = session?.userId === id;

  return (
    <ServerAppPage>
      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <div>
          <div className="flex items-start gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={resolveAvatarUrl(profile.avatar_url, id)}
              alt=""
              className="size-20 rounded-full object-cover"
            />
            <div className="min-w-0">
              {profile.role && (
                <p className="text-meta uppercase tracking-wide text-forest">{profile.role}</p>
              )}
              <h1 className="text-hero">{name}</h1>
              {(mentor.headline ?? profile.headline) && (
                <p className="mt-1 text-ink/70">{mentor.headline ?? profile.headline}</p>
              )}
              {place && <p className="text-meta mt-1 text-ink/50">{place}</p>}
            </div>
          </div>

          {mentor.bio && (
            <section className="mt-8">
              <h2 className="text-lg font-semibold">About these sessions</h2>
              <p className="mt-2 whitespace-pre-line text-ink/70">{mentor.bio}</p>
            </section>
          )}

          {profile.about && (
            <section className="mt-8">
              <h2 className="text-lg font-semibold">About {profile.first_name ?? name}</h2>
              <p className="mt-2 whitespace-pre-line text-ink/70">{profile.about}</p>
            </section>
          )}

          <section className="mt-8">
            <h2 className="text-lg font-semibold">Typical availability</h2>
            {rules.length === 0 ? (
              <p className="mt-2 text-ink/60">No hours published yet.</p>
            ) : (
              <ul className="mt-2 space-y-1 text-ink/70">
                {rules.map((r, i) => (
                  <li key={i}>
                    {WEEKDAYS[r.weekday]} · {minutesToLabel(r.startMinute)}–
                    {minutesToLabel(r.endMinute)}{' '}
                    <span className="text-ink/40">({mentor.timezone.replace(/_/g, ' ')})</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside>
          <BookingPanel
            mentorUserId={id}
            mentorName={name}
            currency={mentor.currency}
            timezone={mentor.timezone}
            sessionTypes={sessionTypes}
            isSelf={isSelf}
            paymentsEnabled={paymentsConfigured()}
            paused={mentor.status === 'paused'}
          />
        </aside>
      </div>
    </ServerAppPage>
  );
}

const WEEKDAYS = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'];

function minutesToLabel(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
