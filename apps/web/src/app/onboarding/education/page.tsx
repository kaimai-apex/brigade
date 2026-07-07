import { OnboardingProgress } from "@/components/onboarding/onboarding-progress";
import { DynamicList } from "@/components/onboarding/dynamic-list";
import { getCurrentUserProfile, saveEducation } from "@/lib/actions/profile";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { redirect } from "next/navigation";

export default async function EducationPage() {
  const profile = await getCurrentUserProfile();
  if (!profile) redirect("/signup");

  const defaultRows = profile.education.map((item) => ({
    school_name: item.school_name,
    program_name: item.program_name ?? "",
    start_date: item.start_date ?? "",
    end_date: item.end_date ?? "",
  }));

  return (
    <>
      <OnboardingProgress currentSlug="education" />
      <Card>
        <CardHeader>
          <CardTitle>Education & certifications</CardTitle>
          <CardDescription>
            Add culinary school, university programs, and certifications with start and end dates.
          </CardDescription>
        </CardHeader>
        <form action={saveEducation} className="space-y-6">
          <DynamicList
            label="Education"
            addLabel="+ Add school"
            minRows={1}
            defaultRows={defaultRows.length > 0 ? defaultRows : [{ school_name: "", program_name: "", start_date: "", end_date: "" }]}
            fields={[
              { name: "school_name", placeholder: "School name" },
              { name: "program_name", placeholder: "Program / certification" },
              { name: "start_date", placeholder: "Start date", type: "date" },
              { name: "end_date", placeholder: "End date", type: "date" },
            ]}
          />
          <Button type="submit">Continue</Button>
        </form>
      </Card>
    </>
  );
}
