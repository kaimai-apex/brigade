'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { api, type Company, type Job, type JobApplication } from '@/lib/api/client';
import { SiteHeader } from '@/components/layout/site-header';
import { CreateCompanyDialog } from '@/components/company/create-company-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

function statusVariant(status: string): 'default' | 'secondary' | 'outline' {
  if (status === 'accepted' || status === 'hired') return 'default';
  if (status === 'rejected') return 'outline';
  return 'secondary';
}

export default function RecruiterDashboardPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<string | null>(null);
  const [applicants, setApplicants] = useState<JobApplication[]>([]);
  const [form, setForm] = useState({
    companyId: '',
    title: '',
    description: '',
    location: '',
    employmentType: 'full-time',
  });

  useEffect(() => {
    api.getCompanies().then((res) => setCompanies(res.data)).catch(() => setCompanies([]));
    api.getJobs().then((res) => setJobs(res.data)).catch(() => setJobs([]));
  }, []);

  async function createJob() {
    if (!form.companyId || !form.title) {
      toast.error('Company and title are required');
      return;
    }
    try {
      await api.createJob(form);
      const res = await api.getJobs();
      setJobs(res.data);
      setForm({ companyId: '', title: '', description: '', location: '', employmentType: 'full-time' });
      toast.success('Job posted');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to create job');
    }
  }

  async function loadApplicants(jobId: string) {
    setSelectedJob(jobId);
    try {
      const res = await api.getApplicants(jobId);
      setApplicants(res.data);
    } catch {
      setApplicants([]);
    }
  }

  return (
    <div className="min-h-screen bg-cream">
      <SiteHeader showAuth={false} />
      <main className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="font-display mb-6 text-3xl font-black">Recruiter dashboard</h1>

        <Card className="mb-8 p-6">
          <h2 className="font-display text-xl font-bold">Post a job</h2>
          <div className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="company">Company</Label>
              <div className="flex gap-2">
                <select
                  id="company"
                  className="h-11 w-full rounded-full border border-input bg-paper px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-cream"
                  value={form.companyId}
                  onChange={(e) => setForm((f) => ({ ...f, companyId: e.target.value }))}
                >
                  <option value="">
                    {companies.length === 0
                      ? 'No companies yet — create one →'
                      : 'Select company'}
                  </option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <CreateCompanyDialog
                  trigger={
                    <Button type="button" variant="outline" className="shrink-0">
                      + New
                    </Button>
                  }
                  onCreated={(company) => {
                    setCompanies((prev) => [company, ...prev]);
                    setForm((f) => ({ ...f, companyId: company.id }));
                  }}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="title">Job title</Label>
                <Input
                  id="title"
                  placeholder="Sous Chef"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  placeholder="New York, NY"
                  value={form.location}
                  onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="What the role involves…"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <Button onClick={createJob}>Publish job</Button>
          </div>
        </Card>

        <section>
          <h2 className="mb-4 font-display text-xl font-bold">Your open jobs</h2>
          <div className="space-y-3">
            {jobs.map((job) => (
              <Card key={job.id} className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="font-semibold">{job.title}</p>
                  {job.companyName && (
                    <p className="text-sm text-ink/60">{job.companyName}</p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant={selectedJob === job.id ? 'secondary' : 'outline'}
                  onClick={() => loadApplicants(job.id)}
                >
                  View applicants
                </Button>
              </Card>
            ))}
            {jobs.length === 0 && (
              <Card className="p-8 text-center text-sm text-ink/60">
                No jobs posted yet.
              </Card>
            )}
          </div>
        </section>

        {selectedJob && (
          <section className="mt-8">
            <h2 className="mb-3 font-display text-xl font-bold">Applicants</h2>
            <Card className="p-0">
              {applicants.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Applicant</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Applied</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {applicants.map((app) => (
                      <TableRow key={app.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar size="sm">
                              <AvatarFallback className="bg-secondary text-xs font-semibold text-forest">
                                {app.user_id.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">
                              {app.user_id.slice(0, 8)}…
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(app.status)} className="capitalize">
                            {app.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-sm text-ink/55">
                          {new Date(app.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="p-8 text-center text-sm text-ink/60">No applicants yet.</p>
              )}
            </Card>
          </section>
        )}
      </main>
    </div>
  );
}
