import { LoginForm } from "@/components/auth/login-form";
import { LoginErrorBanner } from "@/components/auth/login-error-banner";
import { ServerAppPage } from "@/components/layout/server-app-page";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Suspense } from "react";

export default function LoginPage() {
  return (
    <ServerAppPage showAuth={false} className="mx-auto flex max-w-md py-12">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Welcome back</CardTitle>
            <CardDescription>Log in to your Brigade profile.</CardDescription>
          </CardHeader>
          <Suspense fallback={null}>
            <LoginErrorBanner />
          </Suspense>
          <LoginForm />
        </Card>
      </ServerAppPage>
  );
}
