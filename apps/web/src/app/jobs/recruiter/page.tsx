'use client';

import { useEffect, useState } from 'react';
import { api, type Company, type Job, type JobApplication } from '@/lib/api/client';
import { SiteHeader } from '@/components/layout/site-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

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
      alert('Company and title are required');
      return;
    }
    try {
      await api.createJob(form);
      const res = await api.getJobs();
      setJobs(res.data);
      setForm({ companyId: '', title: '', description: '', location: '', employmentType: 'full-time' });
      alert('Job posted');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to create job');
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
    <div className="min-h-screen bg-paper">
      <SiteHeader showAuth={false} />
      <main className="mx-auto max-w-4xl px-6 py-8">
        <h1 className="font-display mb-6 text-3xl font-black">Recruiter dashboard</h1>

        <Card className="mb-8 p-4">
          <h2 className="mb-4 font-semibold">Post a job</h2>
          <div className="space-y-3">
            <select
              className="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm"
              value={form.companyId}
              onChange={(e) => setForm((f) => ({ ...f, companyId: e.target.value }))}
            >
              <option value="">Select company</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <Input
              placeholder="Job title"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
            <Input
              placeholder="Location"
              value={form.location}
              onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
            />
            <Textarea
              placeholder="Description"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
            <Button onClick={createJob}>Publish job</Button>
          </div>
        </Card>

        <section>
          <h2 className="mb-4 font-semibold">Your open jobs</h2>
          <div className="space-y-3">
            {jobs.map((job) => (
              <Card key={job.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="font-semibold">{job.title}</p>
                  {job.companyName && <p className="text-sm text-ink/60">{job.companyName}</p>}
                </div>
                <Button size="sm" variant="outline" onClick={() => loadApplicants(job.id)}>
                  View applicants
                </Button>
              </Card>
            ))}
          </div>
        </section>

        {selectedJob && (
          <section className="mt-8">
            <h2 className="mb-3 font-semibold">Applicants</h2>
            <div className="space-y-2">
              {applicants.map((app) => (
                <Card key={app.id} className="p-3 text-sm">
                  User {app.user_id.slice(0, 8)}… — {app.status}
                </Card>
              ))}
              {applicants.length === 0 && <p className="text-sm text-ink/60">No applicants yet.</p>}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
