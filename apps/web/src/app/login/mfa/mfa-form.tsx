'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import Link from 'next/link';
import { ServerAppPage } from '@/components/layout/server-app-page';

export function MfaForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') ?? '';
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: '', mfaCode: code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? 'MFA verification failed');
        return;
      }
      router.push('/dashboard');
    } catch {
      setError('Could not verify MFA code');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ServerAppPage showAuth={false} className="flex min-h-[calc(100vh-52px)] items-center justify-center">
      <Card className="w-full max-w-md p-6">
        <h1 className="font-display mb-2 text-2xl font-black">Two-factor authentication</h1>
        <p className="mb-6 text-sm text-ink/65">
          Enter the 6-digit code from your authenticator. In local dev, use <code>000000</code>.
        </p>
        <form onSubmit={verify} className="space-y-4">
          <div>
            <Label htmlFor="code">Verification code</Label>
            <Input
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="000000"
              maxLength={6}
              required
            />
          </div>
          {error && <p className="text-sm text-rust">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Verifying…' : 'Verify'}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm">
          <Link href="/login" className="text-forest hover:underline">
            Back to login
          </Link>
        </p>
      </Card>
    </ServerAppPage>
  );
}
