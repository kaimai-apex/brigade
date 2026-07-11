import { SignupForm } from "@/components/auth/signup-form";
import { ServerAppPage } from "@/components/layout/server-app-page";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SignupPage() {
  return (
    <ServerAppPage showAuth={false} className="mx-auto max-w-lg py-12">
      <Card>
        <CardHeader>
          <CardTitle>Join Brigade</CardTitle>
          <CardDescription>
            Create your account with email and a password.
          </CardDescription>
        </CardHeader>
        <SignupForm />
      </Card>
    </ServerAppPage>
  );
}
