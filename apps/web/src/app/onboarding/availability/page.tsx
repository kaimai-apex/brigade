import { OnboardingProgress } from "@/components/onboarding/onboarding-progress";
import { getCurrentUserProfile, saveAvailability } from "@/lib/actions/profile";
import { AVAILABILITY_LABELS } from "@/lib/types/database";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { redirect } from "next/navigation";

export default async function AvailabilityPage() {
  const profile = await getCurrentUserProfile();
  if (!profile) redirect("/signup");

  return (
    <>
      <OnboardingProgress currentSlug="availability" />
      <Card>
        <CardHeader>
          <CardTitle>How you want to work</CardTitle>
          <CardDescription>
            Hospitality moves fast — let venues and Your Brigade know what you&apos;re
            available for. You can change this anytime from your profile.
          </CardDescription>
        </CardHeader>
        <form action={saveAvailability} className="space-y-4">
          <Checkbox
            name="open_to_opportunities"
            label={AVAILABILITY_LABELS.open_to_opportunities}
            defaultChecked={profile.open_to_opportunities}
          />
          <p className="-mt-2 pl-7 text-xs text-ink/55">
            Shows a green &quot;Open to work&quot; badge so managers can find you fast.
          </p>
          <Checkbox
            name="available_private_events"
            label={AVAILABILITY_LABELS.available_private_events}
            defaultChecked={profile.available_private_events}
          />
          <Checkbox
            name="available_contract_work"
            label={AVAILABILITY_LABELS.available_contract_work}
            defaultChecked={profile.available_contract_work}
          />
          <Checkbox
            name="available_emergency_staffing"
            label={AVAILABILITY_LABELS.available_emergency_staffing}
            defaultChecked={profile.available_emergency_staffing}
          />
          <Button type="submit" className="mt-4">
            Continue
          </Button>
        </form>
      </Card>
    </>
  );
}
