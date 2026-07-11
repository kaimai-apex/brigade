import { OnboardingProgress } from "@/components/onboarding/onboarding-progress";
import { completeOnboarding, getCurrentUserProfile } from "@/lib/actions/profile";
import { formatEducationDates } from "@/lib/profile/links";
import { displayName, formatLocation } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
            Make sure everything looks good before appearing on Discover.
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
                {profile.education.map((edu) => {
                  const dates = formatEducationDates(
                    edu.start_date,
                    edu.end_date,
                    edu.graduation_year,
                  );
                  return (
                    <li key={edu.id}>
                      {edu.school_name}
                      {edu.program_name ? ` — ${edu.program_name}` : ""}
                      {dates ? ` (${dates})` : ""}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {profile.work_photos.length > 0 && (
            <section>
              <h4 className="mb-2 font-semibold">Work showcase</h4>
              <p className="text-ink/70">{profile.work_photos.length} photo(s) added</p>
            </section>
          )}

          <section>
            <h4 className="mb-2 font-semibold">Availability</h4>
            <div className="flex flex-wrap gap-2">
              {profile.open_to_opportunities && (
                <Badge className="bg-forest text-white">Open to work</Badge>
              )}
              {profile.available_private_events && (
                <Badge variant="secondary">Private events & weddings</Badge>
              )}
              {profile.available_contract_work && (
                <Badge variant="secondary">Contract / gig ready</Badge>
              )}
              {profile.available_emergency_staffing && (
                <Badge variant="outline" className="border-rust text-rust">
                  Emergency / last-minute shifts
                </Badge>
              )}
            </div>
          </section>
        </div>

        <form action={completeOnboarding} className="mt-8">
          <Button type="submit" variant="secondary">
            Publish profile & join Discover
          </Button>
        </form>
      </Card>
    </>
  );
}
