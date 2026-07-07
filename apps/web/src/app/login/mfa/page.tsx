import { Suspense } from 'react';
import { MfaForm } from './mfa-form';

export default function MfaPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading…</div>}>
      <MfaForm />
    </Suspense>
  );
}
