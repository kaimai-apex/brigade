import { SignupForm } from "@/components/auth/signup-form";
import { SiteHeader } from "@/components/layout/site-header";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-cream">
      <SiteHeader showAuth={false} />
      <main className="mx-auto max-w-lg px-6 py-12">
        <Card>
          <CardHeader>
            <CardTitle>Join Brigade</CardTitle>
            <CardDescription>
              Create your account with email and a password.
            </CardDescription>
          </CardHeader>
          <SignupForm />
        </Card>
      </main>
    </div>
  );
}
