'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { api, type Company } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const SIZES = ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'];

/**
 * Create a Company Page. On success redirects to /company/:slug.
 */
export function CreateCompanyDialog({
  onCreated,
  trigger,
}: {
  onCreated?: (company: Company) => void;
  trigger?: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: '',
    industry: '',
    website: '',
    size: '',
  });

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit() {
    if (!form.name.trim() || busy) return;
    setBusy(true);
    try {
      const company = await api.createCompany({
        name: form.name.trim(),
        industry: form.industry.trim() || undefined,
        website: form.website.trim() || undefined,
        size: form.size || undefined,
      });
      toast.success(`${company.name} page created`);
      onCreated?.(company);
      setForm({ name: '', industry: '', website: '', size: '' });
      setOpen(false);
      const dest = company.slug
        ? `/company/${company.slug}`
        : `/companies/${company.id}`;
      router.push(dest);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to create company');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button className="min-h-11">
            <Plus className="size-4" />
            Create company page
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <Building2 className="size-5 text-forest" />
            Create a company page
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="c-name">Company name *</Label>
            <Input
              id="c-name"
              placeholder="Eleven Madison Park"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              autoFocus
              className="min-h-11"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="c-industry">Industry</Label>
              <Input
                id="c-industry"
                placeholder="Fine Dining"
                value={form.industry}
                onChange={(e) => set('industry', e.target.value)}
                className="min-h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-size">Company size</Label>
              <select
                id="c-size"
                className="h-11 w-full rounded-full border border-input bg-paper px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-cream"
                value={form.size}
                onChange={(e) => set('size', e.target.value)}
              >
                <option value="">Select size</option>
                {SIZES.map((s) => (
                  <option key={s} value={s}>
                    {s} employees
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-website">Website</Label>
            <Input
              id="c-website"
              placeholder="https://…"
              value={form.website}
              onChange={(e) => set('website', e.target.value)}
              className="min-h-11"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" className="min-h-11" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button className="min-h-11" onClick={submit} disabled={!form.name.trim() || busy}>
            {busy ? 'Creating…' : 'Create page'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
