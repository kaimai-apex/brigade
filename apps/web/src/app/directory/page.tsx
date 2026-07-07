import { SiteHeader } from "@/components/layout/site-header";
import { getDirectoryProfiles } from "@/lib/actions/profile";
import {
  displayName,
  formatLocation,
  getInitials,
} from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";

export default async function DirectoryPage() {
  const profiles = await getDirectoryProfiles();

  return (
    <div className="min-h-screen bg-cream">
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-6 pb-20">
        <div className="py-10">
          <p className="font-body text-sm font-extrabold uppercase tracking-widest text-rust">
            Talent directory
          </p>
          <h1 className="mt-3 font-display text-4xl font-black tracking-tight md:text-5xl">
            Meet the Brigade
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-ink/70">
            Hospitality professionals who&apos;ve joined the network — chefs, private
            chefs, operators, and more.
          </p>
        </div>

        {profiles.length === 0 ? (
          <div className="rounded-2xl border border-ink/10 bg-paper p-12 text-center">
            <p className="font-display text-2xl font-bold">No profiles yet</p>
            <p className="mt-3 text-ink/65">
              Be the first to join — create your profile and show up here.
            </p>
            <Link
              href="/signup"
              className="mt-6 inline-block rounded-full bg-rust px-6 py-3 text-sm font-bold text-paper transition hover:-translate-y-0.5"
            >
              Create your profile
            </Link>
          </div>
        ) : (
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {profiles.map((profile) => (
              <li key={profile.id}>
                <Link
                  href={`/profile/${profile.id}`}
                  className="group block h-full rounded-2xl border border-ink/10 bg-paper p-6 transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-sage/40 text-lg font-bold text-forest">
                      {profile.profile_image_url ? (
                        <Image
                          src={profile.profile_image_url}
                          alt={displayName(profile.first_name, profile.last_name)}
                          width={64}
                          height={64}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        getInitials(profile.first_name, profile.last_name)
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold uppercase tracking-wide text-forest">
                        {profile.role}
                      </p>
                      <h2 className="font-display text-xl font-bold leading-tight group-hover:text-forest">
                        {displayName(profile.first_name, profile.last_name)}
                      </h2>
                      <p className="mt-1 text-sm text-ink/60">
                        {formatLocation(profile.city, profile.state, profile.country)}
                      </p>
                    </div>
                  </div>

                  {profile.headline && (
                    <p className="mt-4 line-clamp-2 text-sm leading-relaxed text-ink/75">
                      {profile.headline}
                    </p>
                  )}

                  {profile.expertise_areas && profile.expertise_areas.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {profile.expertise_areas.slice(0, 3).map((area) => (
                        <span
                          key={area}
                          className="rounded-full bg-sage/50 px-2.5 py-0.5 text-xs font-semibold text-forest"
                        >
                          {area}
                        </span>
                      ))}
                    </div>
                  )}

                  {(profile.open_to_opportunities ||
                    profile.available_emergency_staffing) && (
                    <p className="mt-4 text-xs font-semibold text-rust">
                      {profile.open_to_opportunities && "Open to opportunities"}
                      {profile.open_to_opportunities &&
                        profile.available_emergency_staffing &&
                        " · "}
                      {profile.available_emergency_staffing && "Emergency staffing"}
                    </p>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
