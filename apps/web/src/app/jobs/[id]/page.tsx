'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, Bookmark, BookmarkCheck, Building2, MapPin } from 'lucide-react';
import { api, type Job } from '@/lib/api/client';
import { SiteHeader } from '@/components/layout/site-header';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

export default function JobDetailPage() {
  const params = useParams<{ id: string }>();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!params.id) return;
    api
      .getJob(params.id)
      .then(setJob)
      .catch(() => setJob(null))
      .finally(() => setLoading(false));
  }, [params.id]);

  async function apply() {
    if (!job) return;
    try {
      await api.applyToJob(job.id);
      toast.success('Application submitted!');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to apply');
    }
  }

  async function save() {
    if (!job) return;
    try {
      await api.saveJob(job.id);
      setSaved(true);
      toast.success('Saved to your jobs');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save job');
    }
  }

  return (
    <div className="min-h-screen bg-cream">
      <SiteHeader showAuth={false} />
      <main className="mx-auto max-w-2xl px-6 py-8">
        <Link
          href="/jobs"
          className="inline-flex items-center gap-1 text-sm font-semibold text-forest hover:underline"
        >
          <ArrowLeft className="size-4" /> Back to jobs
        </Link>

        {loading || !job ? (
          <Card className="mt-4 p-6">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="mt-3 h-4 w-1/3" />
            <Skeleton className="mt-6 h-24 w-full" />
          </Card>
        ) : (
          <Card className="mt-4 p-6 md:p-8">
            <div className="flex items-start gap-4">
              <Avatar className="size-14 border border-ink/10">
                <AvatarFallback className="bg-secondary text-forest">
                  <Building2 className="size-6" />
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <h1 className="font-display text-3xl font-black leading-tight">
                  {job.title}
                </h1>
                {job.companyName && (
                  <p className="mt-1 font-medium text-ink/70">{job.companyName}</p>
                )}
                {job.location && (
                  <Badge variant="secondary" className="mt-2">
                    <MapPin className="size-3" />
                    {job.location}
                  </Badge>
                )}
              </div>
            </div>

            {job.description && (
              <>
                <Separator className="my-6" />
                <p className="whitespace-pre-wrap leading-relaxed text-ink/80">
                  {job.description}
                </p>
              </>
            )}

            <div className="mt-8 flex gap-3">
              <Button onClick={apply}>Apply now</Button>
              <Button variant="outline" onClick={save} disabled={saved}>
                {saved ? (
                  <>
                    <BookmarkCheck className="size-4" /> Saved
                  </>
                ) : (
                  <>
                    <Bookmark className="size-4" /> Save job
                  </>
                )}
              </Button>
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}
