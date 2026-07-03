import { OnboardingProgress } from "@/components/onboarding/onboarding-progress";
import { DynamicList } from "@/components/onboarding/dynamic-list";
import { FileUpload } from "@/components/profile/file-upload";
import { savePortfolio } from "@/lib/actions/profile";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { redirect } from "next/navigation";

export default async function PortfolioPage() {
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

  const { data: links } = await supabase
    .from("portfolio_links")
    .select("*")
    .eq("user_id", user.id);

  const defaultRows =
    links?.map((link) => ({
      link_type: link.type,
      link_url: link.url,
    })) ?? [];

  return (
    <>
      <OnboardingProgress currentSlug="portfolio" />
      <Card>
        <CardHeader>
          <CardTitle>Portfolio links</CardTitle>
          <CardDescription>
            Share your work online and upload your resume.
          </CardDescription>
        </CardHeader>
        <form action={savePortfolio} className="space-y-6">
          <div className="grid gap-4">
            <div>
              <Label htmlFor="instagram_url">Instagram</Label>
              <Input
                id="instagram_url"
                name="instagram_url"
                placeholder="https://instagram.com/..."
                defaultValue={profile?.instagram_url ?? ""}
              />
            </div>
            <div>
              <Label htmlFor="website_url">Personal website</Label>
              <Input
                id="website_url"
                name="website_url"
                placeholder="https://..."
                defaultValue={profile?.website_url ?? ""}
              />
            </div>
            <div>
              <Label htmlFor="linkedin_url">LinkedIn</Label>
              <Input
                id="linkedin_url"
                name="linkedin_url"
                placeholder="https://linkedin.com/in/..."
                defaultValue={profile?.linkedin_url ?? ""}
              />
            </div>
          </div>

          <FileUpload
            bucket="resumes"
            userId={user.id}
            accept=".pdf,.doc,.docx"
            label="Resume"
            fieldName="resume_url"
            defaultUrl={profile?.resume_url}
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
