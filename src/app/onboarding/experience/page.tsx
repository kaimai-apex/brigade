import { OnboardingProgress } from "@/components/onboarding/onboarding-progress";
import { DynamicList } from "@/components/onboarding/dynamic-list";
import { saveExperience } from "@/lib/actions/profile";
import { createClient } from "@/lib/supabase/server";
import { EXPERTISE_AREAS } from "@/lib/types/database";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { redirect } from "next/navigation";

export default async function ExperiencePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/signup");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const { data: experiences } = await supabase
    .from("experiences")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_current", false);

  const previousRows =
    experiences?.map((exp) => ({
      previous_employer: exp.company_name,
      previous_position: exp.position_title,
    })) ?? [];

  return (
    <>
      <OnboardingProgress currentSlug="experience" />
      <Card>
        <CardHeader>
          <CardTitle>Professional background</CardTitle>
          <CardDescription>
            Share your experience, current role, and areas of expertise.
          </CardDescription>
        </CardHeader>
        <form action={saveExperience} className="space-y-6">
          <div>
            <Label htmlFor="years_experience">Years of experience</Label>
            <Input
              id="years_experience"
              name="years_experience"
              type="number"
              min={0}
              defaultValue={profile?.years_experience ?? ""}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="current_employer">Current employer</Label>
              <Input
                id="current_employer"
                name="current_employer"
                defaultValue={profile?.current_employer ?? ""}
              />
            </div>
            <div>
              <Label htmlFor="current_position">Current position</Label>
              <Input
                id="current_position"
                name="current_position"
                defaultValue={profile?.current_position ?? ""}
              />
            </div>
          </div>

          <DynamicList
            label="Previous employers"
            addLabel="+ Add employer"
            minRows={0}
            defaultRows={previousRows}
            fields={[
              { name: "previous_employer", placeholder: "Company / organization" },
              { name: "previous_position", placeholder: "Position title" },
            ]}
          />

          <fieldset className="space-y-3">
            <legend className="mb-2 text-sm font-semibold">Areas of expertise</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {EXPERTISE_AREAS.map((area) => (
                <label key={area} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="expertise_areas"
                    value={area}
                    defaultChecked={profile?.expertise_areas?.includes(area)}
                    className="rounded border-ink/20 text-forest focus:ring-forest"
                  />
                  {area}
                </label>
              ))}
            </div>
          </fieldset>

          <Button type="submit">Continue</Button>
        </form>
      </Card>
    </>
  );
}
