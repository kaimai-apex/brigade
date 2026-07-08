import { SiteHeader } from "@/components/layout/site-header";
import { getDirectoryProfiles } from "@/lib/actions/profile";
import { displayName, formatLocation, getInitials } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
          <Card className="p-12 text-center">
            <p className="font-display text-2xl font-bold">No profiles yet</p>
            <p className="mt-3 text-ink/65">
              Be the first to join — create your profile and show up here.
            </p>
            <Button asChild variant="rust" className="mt-6">
              <Link href="/signup">Create your profile</Link>
            </Button>
          </Card>
        ) : (
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {profiles.map((profile) => (
              <li key={profile.id}>
                <Link href={`/profile/${profile.id}`} className="group block h-full">
                  <Card className="h-full transition group-hover:-translate-y-1 group-hover:shadow-lg">
                    <div className="flex items-start gap-4">
                      <Avatar className="size-14 border border-ink/10">
                        {profile.profile_image_url && (
                          <AvatarImage
                            src={profile.profile_image_url}
                            alt={displayName(profile.first_name, profile.last_name)}
                          />
                        )}
                        <AvatarFallback className="bg-secondary text-base font-bold text-forest">
                          {getInitials(profile.first_name, profile.last_name)}
                        </AvatarFallback>
                      </Avatar>
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
                          <Badge key={area} variant="secondary">
                            {area}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {(profile.open_to_opportunities ||
                      profile.available_emergency_staffing) && (
                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {profile.open_to_opportunities && (
                          <Badge className="bg-rust text-paper">
                            Open to opportunities
                          </Badge>
                        )}
                        {profile.available_emergency_staffing && (
                          <Badge variant="outline" className="border-rust text-rust">
                            Emergency staffing
                          </Badge>
                        )}
                      </div>
                    )}
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
