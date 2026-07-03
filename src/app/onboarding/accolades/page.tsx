import { OnboardingProgress } from "@/components/onboarding/onboarding-progress";
import { DynamicList } from "@/components/onboarding/dynamic-list";
import { saveAccolades } from "@/lib/actions/profile";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { redirect } from "next/navigation";

export default async function AccoladesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/signup");

  const { data: accolades } = await supabase
    .from("accolades")
    .select("*")
    .eq("user_id", user.id);

  const defaultRows =
    accolades?.map((item) => ({
      title: item.title,
      organization: item.organization ?? "",
      year: item.year?.toString() ?? "",
      description: item.description ?? "",
    })) ?? [];

  return (
    <>
      <OnboardingProgress currentSlug="accolades" />
      <Card>
        <CardHeader>
          <CardTitle>Professional recognition</CardTitle>
          <CardDescription>
            Awards, accolades, media features, and published work.
          </CardDescription>
        </CardHeader>
        <form action={saveAccolades} className="space-y-6">
          <DynamicList
            label="Accolades"
            addLabel="+ Add accolade"
            minRows={0}
            defaultRows={defaultRows}
            fields={[
              { name: "title", placeholder: "Award or recognition" },
              { name: "organization", placeholder: "Organization" },
              { name: "year", placeholder: "Year", type: "number" },
              { name: "description", placeholder: "Brief description" },
            ]}
          />
          <Button type="submit">Continue</Button>
        </form>
      </Card>
    </>
  );
}
