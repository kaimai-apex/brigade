import { Card } from '@/components/ui/card';

export default function Loading() {
  return (
    <div>
      <div className="mb-6">
        <div className="h-4 w-20 animate-pulse rounded bg-neutral-200" />
        <div className="mt-3 h-9 w-80 max-w-full animate-pulse rounded bg-neutral-200" />
        <div className="mt-3 h-5 w-full max-w-2xl animate-pulse rounded bg-neutral-100" />
      </div>
      <div className="mb-6 h-9 w-full max-w-md animate-pulse rounded bg-neutral-100" />
      <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <li key={i}>
            <Card className="h-48 animate-pulse bg-neutral-50" />
          </li>
        ))}
      </ul>
      <p className="mt-6 text-sm text-ink/50">Loading live restaurants…</p>
    </div>
  );
}
