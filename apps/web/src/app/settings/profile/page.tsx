'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuth } from '@/components/auth/auth-provider';
import { AppPage } from '@/components/layout/app-shell';
import { BannerPicker } from '@/components/profile/banner-picker';
import { FileUpload } from '@/components/profile/file-upload';
import { api } from '@/lib/api/client';
import { getBannerById, resolveBannerUrl } from '@/lib/banners';
import { PROFESSIONAL_ROLES } from '@/lib/types/database';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
export default function EditProfilePage() {
  const { session } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bannerId, setBannerId] = useState('kitchen-line');
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    headline: '',
    about: '',
    role: 'Hospitality Professional',
    city: '',
    state: '',
    country: '',
    currentPosition: '',
    avatarUrl: '',
  });

  useEffect(() => {
    if (!session?.userId) return;
    api
      .getProfile(session.userId)
      .then((res) => {
        const p = res as Record<string, unknown>;
        setForm({
          firstName: String(p.firstName ?? p.first_name ?? ''),
          lastName: String(p.lastName ?? p.last_name ?? ''),
          headline: String(p.headline ?? ''),
          about: String(p.about ?? p.bio ?? ''),
          role: String(p.role ?? 'Hospitality Professional'),
          city: String(p.city ?? ''),
          state: String(p.state ?? ''),
          country: String(p.country ?? ''),
          currentPosition: String(p.currentPosition ?? p.current_position ?? ''),
          avatarUrl: String(p.avatarUrl ?? p.profileImageUrl ?? p.profile_image_url ?? ''),
        });
        const cover = (p.coverUrl ?? p.cover_url) as string | undefined;
        setBannerId(getBannerById(cover).id);
      })
      .catch(() => toast.error('Could not load profile'))
      .finally(() => setLoading(false));
  }, [session?.userId]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!session?.userId) return;
    setSaving(true);
    try {
      const fd = new FormData(e.target as HTMLFormElement);
      const avatarFromForm = fd.get('profile_image_url')?.toString() ?? form.avatarUrl;
      await api.updateProfile(session.userId, {
        firstName: form.firstName,
        lastName: form.lastName,
        headline: form.headline,
        about: form.about,
        role: form.role,
        city: form.city,
        state: form.state,
        country: form.country,
        currentPosition: form.currentPosition,
        location: [form.city, form.state, form.country].filter(Boolean).join(', '),
        avatarUrl: avatarFromForm || undefined,
        coverUrl: bannerId,
      });
      toast.success('Profile updated');
      router.push('/profile/me');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save profile');
    } finally {
      setSaving(false);
    }
  }

  if (!session) {
    return (
      <AppPage>
        <Card className="p-8 text-center">
          <p>Sign in to edit your profile.</p>
          <Button asChild className="mt-4">
            <Link href="/login">Log in</Link>
          </Button>
        </Card>
      </AppPage>
    );
  }

  const previewBanner = resolveBannerUrl(bannerId, session.userId);

  return (
    <AppPage showAuth={false} mainClassName="pb-24 py-4">
      <div className="mx-auto w-full max-w-2xl px-0 sm:px-2">
      <div className="mb-4">
        <h1 className="text-page-title">Edit profile</h1>
      </div>

      {loading ? (
        <Card className="p-8 text-sm text-neutral-500">Loading…</Card>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          <Card className="overflow-hidden p-0">
            <div
              className="h-36 bg-cover bg-center"
              style={{ backgroundImage: `url(${previewBanner})` }}
            />
            <div className="space-y-4 p-5">
              <p className="text-sm font-semibold">Cover banner</p>
              <BannerPicker value={bannerId} onChange={setBannerId} />
            </div>
          </Card>

          <Card className="space-y-4 p-5">
            <p className="text-[13px] font-semibold uppercase tracking-wide text-ink/50">
              Identity
            </p>
            <FileUpload
              bucket="avatars"
              userId={session.userId}
              accept="image/*"
              label="Profile photo"
              fieldName="profile_image_url"
              defaultUrl={form.avatarUrl || null}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="firstName">First name</Label>
                <Input
                  id="firstName"
                  value={form.firstName}
                  onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last name</Label>
                <Input
                  id="lastName"
                  value={form.lastName}
                  onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="role">Hospitality role</Label>
              <select
                id="role"
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                className="flex h-12 w-full rounded-xl border border-neutral-200 bg-white px-4 text-sm"
              >
                {PROFESSIONAL_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="headline">Headline</Label>
              <Input
                id="headline"
                value={form.headline}
                onChange={(e) => setForm((f) => ({ ...f, headline: e.target.value }))}
                placeholder="Bartender · Mixology"
              />
            </div>
          </Card>

          <Card className="space-y-4 p-5">
            <p className="text-[13px] font-semibold uppercase tracking-wide text-ink/50">
              About
            </p>
            <div>
              <Label htmlFor="currentPosition">Current position</Label>
              <Input
                id="currentPosition"
                value={form.currentPosition}
                onChange={(e) => setForm((f) => ({ ...f, currentPosition: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="about">Summary</Label>
              <Textarea
                id="about"
                value={form.about}
                onChange={(e) => setForm((f) => ({ ...f, about: e.target.value }))}
                rows={4}
              />
            </div>
          </Card>

          <Card className="space-y-4 p-5">
            <p className="text-[13px] font-semibold uppercase tracking-wide text-ink/50">
              Location
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={form.city}
                  onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={form.state}
                  onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  value={form.country}
                  onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
                />
              </div>
            </div>
          </Card>

          <div
            className="fixed inset-x-0 z-40 flex items-center justify-between gap-3 border-t border-neutral-200 bg-white px-4 py-3 md:static md:border-0 md:bg-transparent md:px-0 md:py-0"
            style={{ bottom: 'calc(56px + env(safe-area-inset-bottom))' }}
          >
            <Button type="button" variant="ghost" asChild className="touch-compact">
              <Link href="/profile/me">Cancel</Link>
            </Button>
            <Button type="submit" disabled={saving} className="min-w-[7rem]">
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </form>
      )}
      </div>
    </AppPage>
  );
}
