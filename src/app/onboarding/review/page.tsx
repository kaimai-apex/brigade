import { OnboardingProgress } from "@/components/onboarding/onboarding-progress";
import { completeOnboarding, getCurrentUserProfile } from "@/lib/actions/profile";
import { displayName, formatLocation } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { redirect } from "next/navigation";

export default async function ReviewPage() {
  const profile = await getCurrentUserProfile();
  if (!profile) redirect("/signup");

  return (
    <>
      <OnboardingProgress currentSlug="review" />
      <Card>
        <CardHeader>
          <CardTitle>Review your profile</CardTitle>
          <CardDescription>
            Make sure everything looks good before joining the directory.
          </CardDescription>
        </CardHeader>

        <div className="space-y-6 text-sm">
          <section>
            <h3 className="font-display text-lg font-bold">
              {displayName(profile.first_name, profile.last_name)}
            </h3>
            <p className="text-ink/70">{profile.headline}</p>
            <p className="mt-1 text-ink/60">
              {profile.role} · {formatLocation(profile.city, profile.state, profile.country)}
            </p>
          </section>

          {profile.bio && (
            <section>
              <h4 className="mb-1 font-semibold">About</h4>
              <p className="text-ink/75">{profile.bio}</p>
            </section>
          )}

          {profile.experiences.length > 0 && (
            <section>
              <h4 className="mb-2 font-semibold">Experience</h4>
              <ul className="space-y-2">
                {profile.experiences.map((exp) => (
                  <li key={exp.id}>
                    <span className="font-medium">{exp.position_title}</span> at{" "}
                    {exp.company_name}
                    {exp.is_current && (
                      <span className="ml-2 rounded-full bg-sage/50 px-2 py-0.5 text-xs">
                        Current
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {profile.education.length > 0 && (
            <section>
              <h4 className="mb-2 font-semibold">Education</h4>
              <ul className="space-y-1">
                {profile.education.map((edu) => (
                  <li key={edu.id}>
                    {edu.school_name}
                    {edu.program_name ? ` — ${edu.program_name}` : ""}
                    {edu.graduation_year ? ` (${edu.graduation_year})` : ""}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {profile.accolades.length > 0 && (
            <section>
              <h4 className="mb-2 font-semibold">Accolades</h4>
              <ul className="space-y-1">
                {profile.accolades.map((item) => (
                  <li key={item.id}>
                    {item.title}
                    {item.year ? ` (${item.year})` : ""}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <h4 className="mb-2 font-semibold">Availability</h4>
            <ul className="flex flex-wrap gap-2">
              {profile.open_to_opportunities && (
                <li className="rounded-full bg-forest/10 px-3 py-1 text-xs font-medium text-forest">
                  Open to opportunities
                </li>
              )}
              {profile.available_private_events && (
                <li className="rounded-full bg-forest/10 px-3 py-1 text-xs font-medium text-forest">
                  Private events
                </li>
              )}
              {profile.available_contract_work && (
                <li className="rounded-full bg-forest/10 px-3 py-1 text-xs font-medium text-forest">
                  Contract work
                </li>
              )}
              {profile.available_emergency_staffing && (
                <li className="rounded-full bg-forest/10 px-3 py-1 text-xs font-medium text-forest">
                  Emergency staffing
                </li>
              )}
            </ul>
          </section>
        </div>

        <form action={completeOnboarding} className="mt-8">
          <Button type="submit" variant="secondary">
            Publish profile & join directory
          </Button>
        </form>
      </Card>
    </>
  );
}
