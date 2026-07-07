'use client';

import { useState } from 'react';
import Link from 'next/link';
import { api, type Job } from '@/lib/api/client';
import { SiteHeader } from '@/components/layout/site-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);

  async function search() {
    setLoading(true);
    try {
      const res = await api.getJobs(query || undefined);
      setJobs(res.data);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-paper">
      <SiteHeader showAuth={false} />
      <main className="mx-auto max-w-4xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="font-display text-3xl font-black">Jobs</h1>
          <Link href="/jobs/recruiter">
            <Button variant="outline" size="sm">
              Recruiter dashboard
            </Button>
          </Link>
        </div>
        <div className="mb-6 flex gap-2">
          <Input
            placeholder="Search jobs..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && search()}
          />
          <Button onClick={search} disabled={loading}>
            {loading ? 'Searching...' : 'Search'}
          </Button>
        </div>
        <div className="space-y-4">
          {jobs.map((job) => (
            <Card key={job.id} className="p-4">
              <Link href={`/jobs/${job.id}`}>
                <h2 className="font-display text-xl font-bold hover:underline">{job.title}</h2>
              </Link>
              {job.companyName && <p className="text-sm opacity-70">{job.companyName}</p>}
              {job.location && <p className="text-sm opacity-60">{job.location}</p>}
              {job.description && (
                <p className="mt-2 text-sm opacity-80 line-clamp-2">{job.description}</p>
              )}
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
