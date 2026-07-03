import { OnboardingProgress } from "@/components/onboarding/onboarding-progress";
import { saveAvailability } from "@/lib/actions/profile";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { redirect } from "next/navigation";

export default async function AvailabilityPage() {
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

  return (
    <>
      <OnboardingProgress currentSlug="availability" />
      <Card>
        <CardHeader>
          <CardTitle>Availability</CardTitle>
          <CardDescription>
            Let others know what kinds of opportunities you&apos;re open to.
          </CardDescription>
        </CardHeader>
        <form action={saveAvailability} className="space-y-4">
          <Checkbox
            name="open_to_opportunities"
            label="Open to opportunities"
            defaultChecked={profile?.open_to_opportunities}
          />
          <Checkbox
            name="available_private_events"
            label="Available for private events"
            defaultChecked={profile?.available_private_events}
          />
          <Checkbox
            name="available_contract_work"
            label="Available for contract work"
            defaultChecked={profile?.available_contract_work}
          />
          <Checkbox
            name="available_emergency_staffing"
            label="Available for emergency staffing"
            defaultChecked={profile?.available_emergency_staffing}
          />
          <Button type="submit" className="mt-4">
            Continue
          </Button>
        </form>
      </Card>
    </>
  );
}
