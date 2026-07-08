'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Briefcase, Building2, MapPin, Search } from 'lucide-react';
import { api, type Job } from '@/lib/api/client';
import { SiteHeader } from '@/components/layout/site-header';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  async function search() {
    setLoading(true);
    try {
      const res = await api.getJobs(query || undefined);
      setJobs(res.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void search();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-cream">
      <SiteHeader showAuth={false} />
      <main className="mx-auto max-w-4xl px-6 py-10">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="font-display text-3xl font-black">Jobs</h1>
          <Button asChild variant="outline" size="sm">
            <Link href="/jobs/recruiter">Recruiter dashboard</Link>
          </Button>
        </div>

        <div className="mb-6 flex gap-2">
          <Input
            placeholder="Search roles, kitchens, cities…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && search()}
          />
          <Button onClick={search} disabled={loading}>
            <Search className="size-4" />
            Search
          </Button>
        </div>

        <div className="space-y-4">
          {loading &&
            Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="p-5">
                <div className="flex gap-4">
                  <Skeleton className="size-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-1/2" />
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                </div>
              </Card>
            ))}

          {!loading &&
            jobs.map((job) => (
              <Link key={job.id} href={`/jobs/${job.id}`} className="group block">
                <Card className="p-5 transition group-hover:-translate-y-1 group-hover:shadow-md">
                  <div className="flex gap-4">
                    <Avatar className="size-12 border border-ink/10">
                      <AvatarFallback className="bg-secondary text-forest">
                        <Building2 className="size-5" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <h2 className="font-display text-xl font-bold leading-tight group-hover:text-forest">
                        {job.title}
                      </h2>
                      {job.companyName && (
                        <p className="text-sm font-medium text-ink/70">
                          {job.companyName}
                        </p>
                      )}
                      {job.location && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <Badge variant="secondary">
                            <MapPin className="size-3" />
                            {job.location}
                          </Badge>
                        </div>
                      )}
                      {job.description && (
                        <p className="mt-3 line-clamp-2 text-sm text-ink/75">
                          {job.description}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              </Link>
            ))}

          {!loading && jobs.length === 0 && (
            <Card className="flex flex-col items-center gap-3 p-12 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-secondary text-forest">
                <Briefcase className="size-6" />
              </div>
              <p className="font-display text-xl font-bold">No openings found</p>
              <p className="text-sm text-ink/60">
                Try a different search, or check back soon for new roles.
              </p>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
