"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { MentorCardPreview } from "./card-preview";
import type { SetupDraft, SetupState } from "./types";

const EMPTY_PROFILE = {
  firstName: null,
  lastName: null,
  avatarUrl: null,
  role: null,
  city: null,
  state: null,
  country: null,
  currentEmployer: null,
  yearsExperience: null,
};

/**
 * Become a mentor — one short form.
 *
 * Name, title, place, description, what you offer, Calendly. Publish sets the
 * card live; payment is platform-collected and scheduling happens on Calendly.
 */
export function SetupWizard() {
  const [state, setState] = useState<SetupState>({
    mentor: null,
    sessionTypes: [],
    availability: [],
    profile: EMPTY_PROFILE,
    readiness: null,
    paymentsConfigured: true,
    draft: {},
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [headline, setHeadline] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [bio, setBio] = useState("");
  const [mentorshipOffered, setMentorshipOffered] = useState("");
  const [calendlyUrl, setCalendlyUrl] = useState("");

  const setDraft = useCallback((patch: SetupDraft) => {
    setState((current) => ({ ...current, draft: { ...current.draft, ...patch } }));
  }, []);

  const hydrateForm = useCallback((json: {
    mentor: SetupState["mentor"];
    profile: SetupState["profile"];
  }) => {
    const mentor = json.mentor;
    const profile = json.profile ?? EMPTY_PROFILE;
    setFirstName(profile.firstName ?? "");
    setLastName(profile.lastName ?? "");
    setHeadline(mentor?.headline ?? "");
    setCity(profile.city ?? "");
    setCountry(profile.country ?? "");
    setBio(mentor?.bio ?? "");
    setMentorshipOffered(
      mentor?.helpOffered?.[0] ?? mentor?.expertise?.join(", ") ?? "",
    );
    setCalendlyUrl(mentor?.calendlyUrl ?? mentor?.defaultMeetingUrl ?? "");
  }, []);

  const reload = useCallback(async () => {
    const res = await fetch("/api/mentorship/me", { cache: "no-store" });
    if (!res.ok) {
      setLoading(false);
      return;
    }
    const json = await res.json();
    setState({
      mentor: json.mentor ?? null,
      sessionTypes: json.sessionTypes ?? [],
      availability: json.availability ?? [],
      profile: json.profile ?? EMPTY_PROFILE,
      readiness: json.readiness ?? null,
      paymentsConfigured: json.paymentsConfigured !== false,
      draft: {},
    });
    hydrateForm({ mentor: json.mentor ?? null, profile: json.profile ?? EMPTY_PROFILE });
    setLoading(false);
  }, [hydrateForm]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const save = useCallback(
    async (patch: Record<string, unknown>) => {
      setSaving(true);
      try {
        const res = await fetch("/api/mentorship/me", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
        const json = await res.json();
        if (!res.ok) {
          toast.error(json.message ?? "Could not save");
          return false;
        }
        await reload();
        return true;
      } catch {
        toast.error("Could not save");
        return false;
      } finally {
        setSaving(false);
      }
    },
    [reload],
  );

  function formPatch(extra: Record<string, unknown> = {}) {
    return {
      firstName,
      lastName,
      headline,
      city,
      country,
      bio,
      mentorshipOffered,
      calendlyUrl,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      ...extra,
    };
  }

  if (loading) {
    return <p className="text-[var(--mk-muted)]">Loading…</p>;
  }

  if (!state.mentor) {
    return (
      <div className="mx-auto max-w-xl py-8 text-center">
        <h1 className="mk-title">Teach what you know</h1>
        <p className="mt-3 text-[15px] text-[var(--mk-muted)]">
          One short form: who you are, what you share, and your Calendly link.
          Brigade takes payment; mentees pick a time on Calendly.
        </p>
        <ul className="mt-6 space-y-2 text-left text-[15px] text-[var(--mk-muted)]">
          <li>· Takes a couple of minutes.</li>
          <li>· Your card stays a draft until you publish.</li>
          <li>· No Stripe Connect or weekly hours required to go live.</li>
        </ul>
        <Button
          className="mt-6"
          disabled={saving}
          onClick={async () => {
            const ok = await save({
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              status: "draft",
              onboardingStep: 0,
            });
            if (ok) toast.success("Draft started — fill in the form below");
          }}
        >
          {saving ? "Setting up…" : "Start setting up"}
        </Button>
      </div>
    );
  }

  const live = state.mentor.status === "active";

  return (
    <div>
      <header className="mb-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="mk-title">
            {live ? "Your mentoring" : "Set up mentoring"}
          </h1>
          <p className="text-[14px] text-[var(--mk-muted)]">
            {live
              ? "Live in the directory"
              : state.mentor.status === "paused"
                ? "Paused — not taking new bookings"
                : "Draft — nobody can see this yet"}
          </p>
        </div>
        {state.readiness && (
          <p className="mt-2 text-[13px] text-[var(--mk-subtle)]">
            {state.readiness.percentComplete}% ready to publish
          </p>
        )}
      </header>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <form
          className="min-w-0 space-y-6"
          onSubmit={async (event) => {
            event.preventDefault();
            const ok = await save(formPatch({ status: "draft", onboardingStep: 1 }));
            if (ok) toast.success("Saved");
          }}
        >
          <div>
            <h2 className="text-[20px] font-semibold text-[var(--mk-text)]">
              Mentor profile
            </h2>
            <p className="mt-1 text-[14px] text-[var(--mk-muted)]">
              These six fields are enough to publish. Mentees pay on Brigade, then
              book a time on your Calendly.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-[13px] font-semibold text-[var(--mk-text)]">Name</span>
              <input
                value={firstName}
                onChange={(event) => {
                  setFirstName(event.target.value);
                  setDraft({ firstName: event.target.value });
                }}
                placeholder="First"
                maxLength={80}
                className="mt-1 h-12 w-full rounded-lg border border-[var(--mk-line)] px-3 text-base"
                required
              />
            </label>
            <label className="block">
              <span className="text-[13px] font-semibold text-[var(--mk-text)]">
                &nbsp;
              </span>
              <input
                value={lastName}
                onChange={(event) => {
                  setLastName(event.target.value);
                  setDraft({ lastName: event.target.value });
                }}
                placeholder="Last"
                maxLength={80}
                className="mt-1 h-12 w-full rounded-lg border border-[var(--mk-line)] px-3 text-base"
                required
              />
            </label>
          </div>

          <label className="block">
            <span className="text-[13px] font-semibold text-[var(--mk-text)]">Title</span>
            <input
              value={headline}
              onChange={(event) => {
                setHeadline(event.target.value);
                setDraft({ headline: event.target.value });
              }}
              maxLength={120}
              placeholder="Private chef · menus and costing"
              className="mt-1 h-12 w-full rounded-lg border border-[var(--mk-line)] px-3 text-base"
              required
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-[13px] font-semibold text-[var(--mk-text)]">
                Where you are based
              </span>
              <input
                value={city}
                onChange={(event) => {
                  setCity(event.target.value);
                  setDraft({ city: event.target.value });
                }}
                placeholder="City"
                maxLength={80}
                className="mt-1 h-12 w-full rounded-lg border border-[var(--mk-line)] px-3 text-base"
                required
              />
            </label>
            <label className="block">
              <span className="text-[13px] font-semibold text-[var(--mk-text)]">
                &nbsp;
              </span>
              <input
                value={country}
                onChange={(event) => {
                  setCountry(event.target.value);
                  setDraft({ country: event.target.value });
                }}
                placeholder="Country"
                maxLength={80}
                className="mt-1 h-12 w-full rounded-lg border border-[var(--mk-line)] px-3 text-base"
                required
              />
            </label>
          </div>

          <label className="block">
            <span className="text-[13px] font-semibold text-[var(--mk-text)]">
              Description
            </span>
            <textarea
              value={bio}
              onChange={(event) => {
                setBio(event.target.value);
                setDraft({ bio: event.target.value });
              }}
              rows={5}
              maxLength={2000}
              placeholder="Your resume / about — background, experience, how you work."
              className="mt-1 w-full rounded-lg border border-[var(--mk-line)] p-3 text-base"
              required
            />
          </label>

          <label className="block">
            <span className="text-[13px] font-semibold text-[var(--mk-text)]">
              Mentorship offered
            </span>
            <textarea
              value={mentorshipOffered}
              onChange={(event) => {
                setMentorshipOffered(event.target.value);
                setDraft({
                  mentorshipOffered: event.target.value,
                  expertise: event.target.value
                    .split(/[\n,]+/)
                    .map((t) => t.trim())
                    .filter(Boolean),
                });
              }}
              rows={4}
              maxLength={2000}
              placeholder="What you want to share — costing, menu design, private service, etc."
              className="mt-1 w-full rounded-lg border border-[var(--mk-line)] p-3 text-base"
              required
            />
          </label>

          <label className="block">
            <span className="text-[13px] font-semibold text-[var(--mk-text)]">
              Calendly booking link
            </span>
            <input
              value={calendlyUrl}
              onChange={(event) => {
                setCalendlyUrl(event.target.value);
                setDraft({ calendlyUrl: event.target.value });
              }}
              type="url"
              inputMode="url"
              placeholder="https://calendly.com/your-name/mentoring"
              className="mt-1 h-12 w-full rounded-lg border border-[var(--mk-line)] px-3 text-base"
              required
            />
            <span className="mt-1 block text-[13px] text-[var(--mk-subtle)]">
              Shown to the mentee after they pay. Not on your public page until then.
            </span>
          </label>

          <div className="flex flex-wrap items-center gap-3 border-t border-[var(--mk-line)] pt-5">
            <Button type="submit" variant="outline" disabled={saving || publishing}>
              {saving ? "Saving…" : "Save draft"}
            </Button>

            {live ? (
              <>
                <Button asChild>
                  <Link href={`/mentors/${state.mentor.userId}`}>View public page</Link>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={saving || publishing}
                  onClick={async () => {
                    setPublishing(true);
                    try {
                      const ok = await save(formPatch({ status: "paused" }));
                      if (ok) toast.success("Bookings paused");
                    } finally {
                      setPublishing(false);
                    }
                  }}
                >
                  Pause bookings
                </Button>
              </>
            ) : (
              <Button
                type="button"
                disabled={
                  saving ||
                  publishing ||
                  !firstName.trim() ||
                  !lastName.trim() ||
                  !headline.trim() ||
                  !city.trim() ||
                  !country.trim() ||
                  !bio.trim() ||
                  !mentorshipOffered.trim() ||
                  !calendlyUrl.trim()
                }
                onClick={async () => {
                  setPublishing(true);
                  try {
                    const ok = await save(
                      formPatch({ status: "active", onboardingStep: 1 }),
                    );
                    if (ok) toast.success("You are live in the mentor directory");
                  } finally {
                    setPublishing(false);
                  }
                }}
              >
                {publishing ? "Publishing…" : "Publish"}
              </Button>
            )}
          </div>

          {state.readiness && !state.readiness.canPublish && !live && (
            <p className="text-[13px] text-[var(--mk-subtle)]">
              Still to do:{" "}
              {state.readiness.blocking.map((item) => item.label.toLowerCase()).join(", ")}.
            </p>
          )}
        </form>

        <aside className="lg:sticky lg:top-8 lg:self-start">
          <MentorCardPreview
            state={{
              ...state,
              profile: {
                ...state.profile,
                firstName: firstName || state.profile.firstName,
                lastName: lastName || state.profile.lastName,
                city: city || state.profile.city,
                country: country || state.profile.country,
              },
              draft: {
                ...state.draft,
                headline,
                bio,
                expertise: mentorshipOffered
                  .split(/[\n,]+/)
                  .map((t) => t.trim())
                  .filter(Boolean),
              },
            }}
          />
        </aside>
      </div>
    </div>
  );
}
