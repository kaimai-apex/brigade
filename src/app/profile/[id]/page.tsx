import { getFullProfile, signOut } from "@/lib/actions/profile";
import { syncProfileNamesFromAuth } from "@/lib/profile/sync-names";
import { createClient } from "@/lib/supabase/server";
import {
  displayName,
  formatLocation,
  getInitials,
} from "@/lib/utils";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user?.id === id) {
    await syncProfileNamesFromAuth(user);
  }

  const profile = await getFullProfile(id);
  if (!profile) notFound();

  const isOwner = user?.id === profile.id;

  const links = [
    { label: "Instagram", url: profile.instagram_url },
    { label: "Website", url: profile.website_url },
    { label: "LinkedIn", url: profile.linkedin_url },
    ...profile.portfolio_links.map((link) => ({
      label: link.type,
      url: link.url,
    })),
  ].filter((link) => link.url);

  return (
    <div className="min-h-screen bg-cream">
      <header className="mx-auto flex max-w-4xl items-center justify-between px-6 py-6">
        <Link href="/" className="font-display text-2xl font-black">
          Brigade
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/directory" className="text-sm font-semibold opacity-75 hover:opacity-100">
            Directory
          </Link>
          {isOwner && (
            <>
              <Link href="/onboarding/basic-info">
                <Button variant="outline" size="sm">
                  Edit profile
                </Button>
              </Link>
              <form action={signOut}>
                <Button type="submit" variant="ghost" size="sm">
                  Sign out
                </Button>
              </form>
            </>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 pb-20">
        <section className="rounded-3xl border border-ink/10 bg-paper p-8 md:p-10">
          <div className="flex flex-col gap-6 md:flex-row md:items-start">
            <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-full bg-sage/40 text-3xl font-bold text-forest">
              {profile.profile_image_url ? (
                <Image
                  src={profile.profile_image_url}
                  alt={displayName(profile.first_name, profile.last_name)}
                  width={112}
                  height={112}
                  className="h-full w-full object-cover"
                />
              ) : (
                getInitials(profile.first_name, profile.last_name)
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold uppercase tracking-wide text-forest">
                {profile.role}
              </p>
              <h1 className="font-display text-4xl font-black tracking-tight">
                {displayName(profile.first_name, profile.last_name)}
              </h1>
              <p className="mt-2 text-lg text-ink/75">{profile.headline}</p>
              <p className="mt-2 text-sm text-ink/60">
                {formatLocation(profile.city, profile.state, profile.country)}
                {profile.years_experience != null &&
                  ` · ${profile.years_experience}+ years experience`}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {profile.open_to_opportunities && (
                  <Badge>Open to opportunities</Badge>
                )}
                {profile.available_private_events && (
                  <Badge>Private events</Badge>
                )}
                {profile.available_contract_work && <Badge>Contract work</Badge>}
                {profile.available_emergency_staffing && (
                  <Badge>Emergency staffing</Badge>
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

        {profile.expertise_areas && profile.expertise_areas.length > 0 && (
          <Section title="Areas of expertise">
            <div className="flex flex-wrap gap-2">
              {profile.expertise_areas.map((area) => (
                <Badge key={area}>{area}</Badge>
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
              {profile.education.map((edu) => (
                <li key={edu.id}>
                  <p className="font-semibold">{edu.school_name}</p>
                  {edu.program_name && (
                    <p className="text-sm text-ink/70">{edu.program_name}</p>
                  )}
                  {edu.graduation_year && (
                    <p className="text-sm text-ink/50">{edu.graduation_year}</p>
                  )}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {links.length > 0 && (
          <Section title="Portfolio">
            <ul className="space-y-2">
              {links.map((link) => (
                <li key={`${link.label}-${link.url}`}>
                  <a
                    href={link.url!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-forest underline-offset-2 hover:underline"
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

        {profile.accolades.length > 0 && (
          <Section title="Accolades">
            <ul className="space-y-3">
              {profile.accolades.map((item) => (
                <li key={item.id}>
                  <p className="font-semibold">{item.title}</p>
                  {item.organization && (
                    <p className="text-sm text-ink/70">{item.organization}</p>
                  )}
                  {item.description && (
                    <p className="mt-1 text-sm text-ink/60">{item.description}</p>
                  )}
                </li>
              ))}
            </ul>
          </Section>
        )}
      </main>
    </div>
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
    <section className="mt-8 rounded-2xl border border-ink/10 bg-paper p-6">
      <h2 className="mb-4 font-display text-xl font-bold">{title}</h2>
      {children}
    </section>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-sage/50 px-3 py-1 text-xs font-semibold text-forest">
      {children}
    </span>
  );
}
