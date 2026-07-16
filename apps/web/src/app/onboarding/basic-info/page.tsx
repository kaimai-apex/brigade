import { OnboardingProgress } from "@/components/onboarding/onboarding-progress";
import { FileUpload } from "@/components/profile/file-upload";
import { BannerField } from "@/components/profile/banner-field";
import { saveBasicInfo } from "@/lib/actions/profile";
import { getCurrentUserProfile } from "@/lib/actions/profile";
import { PROFESSIONAL_ROLES } from "@/lib/types/database";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { redirect } from "next/navigation";

export default async function BasicInfoPage() {
  const profile = await getCurrentUserProfile();
  if (!profile) redirect("/signup");

  return (
    <>
      <OnboardingProgress currentSlug="basic-info" />
      <Card>
        <CardHeader>
          <CardTitle>Basic information</CardTitle>
          <CardDescription>
            Tell venues and teams who you are — role, city, and how you work.
          </CardDescription>
        </CardHeader>
        <form action={saveBasicInfo} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="first_name">First name</Label>
              <Input
                id="first_name"
                name="first_name"
                defaultValue={profile.first_name ?? ""}
                required
              />
            </div>
            <div>
              <Label htmlFor="last_name">Last name</Label>
              <Input
                id="last_name"
                name="last_name"
                defaultValue={profile.last_name ?? ""}
                required
              />
            </div>
          </div>

          <FileUpload
            bucket="avatars"
            userId={profile.id}
            accept="image/*"
            label="Profile photo"
            fieldName="profile_image_url"
            defaultUrl={profile.profile_image_url}
          />

          <BannerField defaultValue={profile.cover_url} />

          <div>
            <Label htmlFor="role">Hospitality role</Label>
            <select
              id="role"
              name="role"
              defaultValue={profile.role ?? "Hospitality Professional"}
              className="flex h-11 w-full rounded-xl border border-ink/15 bg-paper px-4 text-sm outline-none transition focus:border-forest focus:ring-2 focus:ring-forest/20"
              required
            >
              {PROFESSIONAL_ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="headline">Headline</Label>
            <Input
              id="headline"
              name="headline"
              placeholder="Bartender · Mixology & Wedding Events"
              defaultValue={profile.headline ?? ""}
              required
            />
          </div>

          <div>
            <Label htmlFor="current_position">Current position</Label>
            <Input
              id="current_position"
              name="current_position"
              defaultValue={profile.current_position ?? ""}
              required
            />
          </div>

          <div>
            <Label htmlFor="bio">Professional summary</Label>
            <Textarea
              id="bio"
              name="bio"
              placeholder="Brief overview of your hospitality background — venues, events, specialties."
              defaultValue={profile.bio ?? ""}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="city">City</Label>
              <Input id="city" name="city" defaultValue={profile.city ?? ""} required />
            </div>
            <div>
              <Label htmlFor="state">State</Label>
              <Input id="state" name="state" defaultValue={profile.state ?? ""} />
            </div>
            <div>
              <Label htmlFor="country">Country</Label>
              <Input id="country" name="country" defaultValue={profile.country ?? ""} required />
            </div>
          </div>

          <div className="sticky bottom-0 -mx-4 border-t border-neutral-100 bg-white px-4 py-3">
            <Button type="submit" className="w-full">
              Continue
            </Button>
          </div>
        </form>
      </Card>
    </>
  );
}
