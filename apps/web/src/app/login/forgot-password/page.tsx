import Link from 'next/link';
import { ServerAppPage } from '@/components/layout/server-app-page';
import { Card } from '@/components/ui/card';

export default function ForgotPasswordPage() {
  return (
    <ServerAppPage showAuth={false} className="flex min-h-[calc(100vh-52px)] items-center justify-center">
      <Card className="w-full max-w-md p-6">
        <h1 className="font-display mb-2 text-2xl font-black">Reset password</h1>
        <p className="text-sm text-ink/65">
          Password reset is handled by the auth service. Wire your email provider in{' '}
          <code>services/auth-service</code> when you integrate the backend.
        </p>
        <p className="mt-6 text-center text-sm">
          <Link href="/login" className="text-forest hover:underline">
            Back to login
          </Link>
        </p>
      </Card>
    </ServerAppPage>
  );
}
