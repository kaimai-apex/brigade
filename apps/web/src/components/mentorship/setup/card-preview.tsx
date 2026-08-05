"use client";

import { ExploreCard } from "@/components/mentorship/mentor-card";
import { formatMoney } from "@/lib/mentorship/pricing";
import type { MentorListing } from "@/lib/server/mentorship-db";
import type { SetupState } from "./types";

/**
 * What the mentor is actually building, on both surfaces it lands on.
 *
 * The card is the real `ExploreCard` rather than a mock-up of one — the whole
 * point of showing it is to answer "what will people see", and a preview that
 * is only approximately the card answers a different question.
 *
 * The page summary underneath exists because the card CANNOT show a headline or
 * bio: `ExploreCard` leads with role and employer. Without this, someone spends
 * ten minutes writing a bio while a preview beside them never changes, and
 * reasonably concludes it did not save.
 *
 * Everything here is either typed in this flow or already on their Brigade
 * profile. Nothing is invented to make the card look fuller.
 */
export function MentorCardPreview({ state }: { state: SetupState }) {
  const { mentor, profile, sessionTypes, draft } = state;

  // Unsaved edits win, so the preview keeps up with the form.
  const headline = draft.headline ?? mentor?.headline ?? null;
  const bio = draft.bio ?? mentor?.bio ?? null;
  const expertise = draft.expertise ?? mentor?.expertise ?? [];

  const active = sessionTypes.filter((type) => type.active);
  const cheapest = active.length ? Math.min(...active.map((type) => type.priceCents)) : null;
  const currency = mentor?.currency ?? "usd";

  const listing: MentorListing = {
    userId: mentor?.userId ?? "preview",
    firstName: profile.firstName,
    lastName: profile.lastName,
    headline,
    role: profile.role,
    city: profile.city,
    state: profile.state,
    country: profile.country,
    avatarUrl: profile.avatarUrl,
    timezone: mentor?.timezone ?? "UTC",
    currency,
    fromPriceCents: cheapest,
    sessionCount: active.length,
    expertiseAreas: expertise,
    currentEmployer: profile.currentEmployer,
    yearsExperience: profile.yearsExperience,
    // A card previewed today is a mentor created today; the "New" badge it
    // shows is the one they will genuinely get.
    createdAt: new Date().toISOString(),
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--mk-subtle)]">
          In the directory
        </p>
        <p className="mt-1 text-[13px] text-[var(--mk-muted)]">
          The card people scroll past.
        </p>

        <div className="mt-3 max-w-[320px]">
          <ExploreCard mentor={listing} preview />
        </div>

        {active.length === 0 && (
          <p className="mt-3 max-w-[320px] text-[13px] text-[var(--mk-subtle)]">
            Add a session and the price appears on the card.
          </p>
        )}
        {!profile.avatarUrl && (
          <p className="mt-2 max-w-[320px] text-[13px] text-[var(--mk-subtle)]">
            No photo on your profile yet — cards with a face get booked more.{" "}
            <a href="/settings/profile" className="underline underline-offset-4">
              Add one
            </a>
            .
          </p>
        )}
      </div>

      {/* The card leads with role and employer, so the headline and bio have to
          be shown somewhere or they look like they vanished. */}
      <div className="max-w-[320px]">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--mk-subtle)]">
          On your mentor page
        </p>
        <p className="mt-1 text-[13px] text-[var(--mk-muted)]">
          What they read before booking.
        </p>

        <div className="mt-3 rounded-2xl border border-[var(--mk-line)] p-4">
          <p className="text-[15px] font-semibold text-[var(--mk-text)]">
            {[profile.firstName, profile.lastName].filter(Boolean).join(" ") ||
              "Your name"}
          </p>
          <p className="mt-1 text-[14px] text-[var(--mk-muted)]">
            {headline?.trim() || (
              <span className="text-[var(--mk-subtle)]">Your headline goes here.</span>
            )}
          </p>

          {bio?.trim() ? (
            <p className="mt-3 line-clamp-5 whitespace-pre-line text-[14px] text-[var(--mk-muted)]">
              {bio}
            </p>
          ) : (
            <p className="mt-3 text-[14px] text-[var(--mk-subtle)]">
              What people get out of a session with you.
            </p>
          )}

          {expertise.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {expertise.slice(0, 6).map((tag) => (
                <span
                  key={tag}
                  className="rounded-full px-2.5 py-1 text-[12px] text-[var(--mk-text)] shadow-[inset_0_0_0_1px_var(--mk-chip-line)]"
                >
                  {tag}
                </span>
              ))}
              {expertise.length > 6 && (
                <span className="px-1 py-1 text-[12px] text-[var(--mk-subtle)]">
                  +{expertise.length - 6}
                </span>
              )}
            </div>
          )}

          {active.length > 0 && (
            <ul className="mt-4 space-y-1.5 border-t border-[var(--mk-line)] pt-3">
              {active.slice(0, 3).map((type) => (
                <li key={type.id} className="flex justify-between gap-3 text-[13px]">
                  <span className="truncate text-[var(--mk-muted)]">{type.title}</span>
                  <span className="shrink-0 font-medium text-[var(--mk-text)]">
                    {type.priceCents === 0 ? "Free" : formatMoney(type.priceCents, currency)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
