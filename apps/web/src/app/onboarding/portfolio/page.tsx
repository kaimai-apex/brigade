import { OnboardingProgress } from "@/components/onboarding/onboarding-progress";
import { DynamicList } from "@/components/onboarding/dynamic-list";
import { FileUpload } from "@/components/profile/file-upload";
import { WorkPhotosUpload } from "@/components/profile/work-photos-upload";
import { getCurrentUserProfile, savePortfolio } from "@/lib/actions/profile";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { redirect } from "next/navigation";

export default async function PortfolioPage() {
  const profile = await getCurrentUserProfile();
  if (!profile) redirect("/signup");

  const defaultRows = profile.portfolio_links.map((link) => ({
    link_type: link.type,
    link_url: link.url,
  }));

  return (
    <>
      <OnboardingProgress currentSlug="portfolio" />
      <Card>
        <CardHeader>
          <CardTitle>Portfolio & work showcase</CardTitle>
          <CardDescription>
            Share links to your work and upload photos that appear on your public profile.
          </CardDescription>
        </CardHeader>
        <form action={savePortfolio} className="space-y-6">
          <WorkPhotosUpload
            userId={profile.id}
            defaultUrls={profile.work_photos.map((photo) => photo.image_url)}
          />

          <div className="grid gap-4">
            <div>
              <Label htmlFor="instagram_url">Instagram</Label>
              <Input
                id="instagram_url"
                name="instagram_url"
                placeholder="@yourhandle or https://instagram.com/yourhandle"
                defaultValue={profile.instagram_url ?? ""}
              />
            </div>
            <div>
              <Label htmlFor="website_url">Personal website</Label>
              <Input
                id="website_url"
                name="website_url"
                placeholder="https://yourwebsite.com"
                defaultValue={profile.website_url ?? ""}
              />
            </div>
            <div>
              <Label htmlFor="linkedin_url">LinkedIn</Label>
              <Input
                id="linkedin_url"
                name="linkedin_url"
                placeholder="https://linkedin.com/in/..."
                defaultValue={profile.linkedin_url ?? ""}
              />
            </div>
          </div>

          <FileUpload
            bucket="resumes"
            userId={profile.id}
            accept=".pdf,.doc,.docx"
            label="Resume"
            fieldName="resume_url"
            defaultUrl={profile.resume_url}
          />

          <DynamicList
            label="Additional links"
            addLabel="+ Add link"
            minRows={0}
            defaultRows={defaultRows}
            fields={[
              { name: "link_type", placeholder: "Type (portfolio, other)" },
              { name: "link_url", placeholder: "https://..." },
            ]}
          />

          <Button type="submit">Continue</Button>
        </form>
      </Card>
    </>
  );
}
