'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api, type Job } from '@/lib/api/client';
import { SiteHeader } from '@/components/layout/site-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function JobDetailPage() {
  const params = useParams<{ id: string }>();
  const [job, setJob] = useState<Job | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!params.id) return;
    api
      .getJob(params.id)
      .then(setJob)
      .catch(() => setJob(null));
  }, [params.id]);

  async function apply() {
    if (!job) return;
    try {
      await api.applyToJob(job.id);
      alert('Application submitted!');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to apply');
    }
  }

  async function save() {
    if (!job) return;
    try {
      await api.saveJob(job.id);
      setSaved(true);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to save job');
    }
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-paper">
        <SiteHeader showAuth={false} />
        <main className="mx-auto max-w-2xl px-6 py-12 text-center opacity-60">Loading…</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper">
      <SiteHeader showAuth={false} />
      <main className="mx-auto max-w-2xl px-6 py-8">
        <Link href="/jobs" className="text-sm text-forest hover:underline">
          ← Back to jobs
        </Link>
        <Card className="mt-4 p-6">
          <h1 className="font-display text-3xl font-black">{job.title}</h1>
          {job.companyName && <p className="mt-2 text-ink/70">{job.companyName}</p>}
          {job.location && <p className="text-sm text-ink/60">{job.location}</p>}
          {job.description && <p className="mt-6 whitespace-pre-wrap text-ink/80">{job.description}</p>}
          <div className="mt-6 flex gap-3">
            <Button onClick={apply}>Apply now</Button>
            <Button variant="outline" onClick={save} disabled={saved}>
              {saved ? 'Saved' : 'Save job'}
            </Button>
          </div>
        </Card>
      </main>
    </div>
  );
}
