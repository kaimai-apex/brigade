import { LoginForm } from "@/components/auth/login-form";
import { SiteHeader } from "@/components/layout/site-header";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-cream">
      <SiteHeader showAuth={false} />
      <main className="mx-auto flex max-w-md px-6 py-12">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Welcome back</CardTitle>
            <CardDescription>Log in to your Brigade profile.</CardDescription>
          </CardHeader>
          <LoginForm />
        </Card>
      </main>
    </div>
  );
}
