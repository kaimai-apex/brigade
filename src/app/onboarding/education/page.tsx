import { OnboardingProgress } from "@/components/onboarding/onboarding-progress";
import { DynamicList } from "@/components/onboarding/dynamic-list";
import { saveEducation } from "@/lib/actions/profile";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { redirect } from "next/navigation";

export default async function EducationPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/signup");

  const { data: education } = await supabase
    .from("education")
    .select("*")
    .eq("user_id", user.id);

  const defaultRows =
    education?.map((item) => ({
      school_name: item.school_name,
      program_name: item.program_name ?? "",
      graduation_year: item.graduation_year?.toString() ?? "",
    })) ?? [];

  return (
    <>
      <OnboardingProgress currentSlug="education" />
      <Card>
        <CardHeader>
          <CardTitle>Education & certifications</CardTitle>
          <CardDescription>
            Add culinary school, university programs, and certifications.
          </CardDescription>
        </CardHeader>
        <form action={saveEducation} className="space-y-6">
          <DynamicList
            label="Education"
            addLabel="+ Add school"
            minRows={1}
            defaultRows={defaultRows}
            fields={[
              { name: "school_name", placeholder: "School name" },
              { name: "program_name", placeholder: "Program / certification" },
              { name: "graduation_year", placeholder: "Year", type: "number" },
            ]}
          />
          <Button type="submit">Continue</Button>
        </form>
      </Card>
    </>
  );
}
