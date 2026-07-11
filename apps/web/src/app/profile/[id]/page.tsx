import { getFullProfile } from "@/lib/actions/profile";
import { getConnectProSession } from "@/lib/connectpro/server";
import {
  formatEducationDates,
  formatInstagramLabel,
  formatWebsiteLabel,
  normalizeInstagramUrl,
  normalizeWebsiteUrl,
} from "@/lib/profile/links";
import { cn, displayName, formatLocation, getInitials } from "@/lib/utils";
import { resolveAvatarUrl } from "@/lib/avatars";
import { resolveBannerUrl } from "@/lib/banners";
import { ServerAppPage } from "@/components/layout/server-app-page";
import { ProfileViewRecorder } from "@/components/profile/profile-view-recorder";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getConnectProSession();

  const profile = await getFullProfile(id);
  if (!profile) notFound();

  const isOwner = session?.userId === profile.id;
  const bannerSrc = resolveBannerUrl(profile.cover_url, profile.id);

  const availability = [
    profile.open_to_opportunities && "Open to work",
    profile.available_private_events && "Private events & weddings",
    profile.available_contract_work && "Contract / gig ready",
    profile.available_emergency_staffing && "Emergency / last-minute shifts",
  ].filter(Boolean) as string[];

  const links = [
    profile.instagram_url
      ? {
          label: formatInstagramLabel(profile.instagram_url),
          url: normalizeInstagramUrl(profile.instagram_url),
        }
      : null,
    profile.website_url
      ? {
          label: formatWebsiteLabel(profile.website_url),
          url: normalizeWebsiteUrl(profile.website_url),
        }
      : null,
    profile.linkedin_url
      ? {
          label: formatWebsiteLabel(profile.linkedin_url),
          url: normalizeWebsiteUrl(profile.linkedin_url),
        }
      : null,
    ...profile.portfolio_links.map((link) => ({
      label: formatWebsiteLabel(link.url),
      url: normalizeWebsiteUrl(link.url),
    })),
  ].filter(Boolean) as { label: string; url: string }[];

  return (
    <ServerAppPage showAuth={false} className="pb-20 pt-8">
      <ProfileViewRecorder profileId={profile.id} isOwner={isOwner} />

      <div className="mx-auto max-w-4xl">
        <section className="overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm">
          <div
            className="h-40 bg-cover bg-center md:h-52"
            style={{ backgroundImage: `url(${bannerSrc})` }}
          />
          <div className="px-8 pb-8 md:px-10">
            <div className="-mt-14 flex flex-col gap-6 md:flex-row md:items-end">
              <div className="relative shrink-0 self-start">
                <Avatar
                  className={cn(
                    "size-28 border-4 border-white",
                    profile.open_to_opportunities &&
                      "ring-4 ring-forest ring-offset-2 ring-offset-white",
                  )}
                >
                  <AvatarImage
                    src={resolveAvatarUrl(profile.profile_image_url, profile.id)}
                    alt={displayName(profile.first_name, profile.last_name)}
                    className="object-cover"
                  />
                  <AvatarFallback className="bg-secondary text-3xl font-bold text-forest">
                    {getInitials(profile.first_name, profile.last_name)}
                  </AvatarFallback>
                </Avatar>
                {profile.open_to_opportunities && (
                  <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-forest px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-paper shadow-sm">
                    Open to work
                  </span>
                )}
              </div>

              <div className="flex-1">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wide text-forest">
                      {profile.role}
                    </p>
                    <h1 className="font-display text-4xl font-black tracking-tight">
                      {displayName(profile.first_name, profile.last_name)}
                    </h1>
                  </div>
                  {isOwner && (
                    <Button asChild variant="outline" size="sm">
                      <Link href="/settings/profile">Edit profile</Link>
                    </Button>
                  )}
                </div>

                <p className="mt-2 text-lg text-ink/75">{profile.headline}</p>
                <p className="mt-2 text-sm text-ink/60">
                  {formatLocation(profile.city, profile.state, profile.country)}
                  {profile.years_experience != null &&
                    ` · ${profile.years_experience}+ years experience`}
                </p>

                {availability.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {availability.map((label) => (
                      <Badge key={label} variant="secondary">
                        {label}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {profile.bio && (
          <Section title="About">
            <p className="leading-relaxed text-ink/75">{profile.bio}</p>
          </Section>
        )}

        {profile.work_photos.length > 0 && (
          <Section title="Work showcase">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {profile.work_photos.map((photo) => (
                <div
                  key={photo.id}
                  className="relative aspect-square overflow-hidden rounded-xl border border-ink/10"
                >
                  <Image
                    src={photo.image_url}
                    alt="Work showcase"
                    fill
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          </Section>
        )}

        {profile.expertise_areas && profile.expertise_areas.length > 0 && (
          <Section title="Areas of expertise">
            <div className="flex flex-wrap gap-2">
              {profile.expertise_areas.map((area) => (
                <Badge key={area} variant="secondary">
                  {area}
                </Badge>
              ))}
            </div>
          </Section>
        )}

        {profile.experiences.length > 0 && (
          <Section title="Experience">
            <ul className="space-y-4">
              {profile.experiences.map((exp) => (
                <li key={exp.id} className="border-l-2 border-sage pl-4">
                  <p className="font-semibold">{exp.position_title}</p>
                  <p className="text-ink/70">{exp.company_name}</p>
                  {exp.description && (
                    <p className="mt-1 text-sm text-ink/60">{exp.description}</p>
                  )}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {profile.education.length > 0 && (
          <Section title="Education">
            <ul className="space-y-3">
              {profile.education.map((edu) => {
                const dates = formatEducationDates(
                  edu.start_date,
                  edu.end_date,
                  edu.graduation_year,
                );
                return (
                  <li key={edu.id}>
                    <p className="font-semibold">{edu.school_name}</p>
                    {edu.program_name && (
                      <p className="text-sm text-ink/70">{edu.program_name}</p>
                    )}
                    {dates && <p className="text-sm text-ink/50">{dates}</p>}
                  </li>
                );
              })}
            </ul>
          </Section>
        )}

        {links.length > 0 && (
          <Section title="Links">
            <ul className="space-y-2">
              {links.map((link, i) => (
                <li key={`${link.label}-${link.url}`}>
                  {i > 0 && <Separator className="mb-2" />}
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-forest underline-offset-2 hover:underline break-all"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
              {profile.resume_url && (
                <li>
                  <a
                    href={profile.resume_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-forest underline-offset-2 hover:underline"
                  >
                    Resume
                  </a>
                </li>
              )}
            </ul>
          </Section>
        )}
      </div>
    </ServerAppPage>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8 rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 font-display text-xl font-bold">{title}</h2>
      {children}
    </section>
  );
}
