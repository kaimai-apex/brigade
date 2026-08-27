import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { JournalShell } from "@/components/journal/journal-shell";
import { ResourceGate } from "@/components/journal/resource-gate";
import { viewerHasResourceAccess } from "@/lib/journal/access";
import { ROADMAP_DOWNLOAD_PATH } from "@/lib/journal/roadmap";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Jordan's roadmap: how to become a private chef",
  description:
    "Jordan's 7-step roadmap from restaurant kitchens to paid private clients, with the thing that has to be true before you move to the next step.",
};

/**
 * The roadmap, as a page.
 *
 * The artwork is a single SVG rather than markup so it stays one shareable,
 * downloadable asset — the same file Jordan posts to Instagram is the file this
 * page renders. It is authored tall-and-narrow (480 × 2058) so a phone reads it
 * at close to 1:1 and the road runs with the scroll instead of across it;
 * `max-w` keeps it from stretching into a billboard on a desktop.
 *
 * The file is not in `public/`. `/roadmap/download` checks the unlock cookie
 * before serving bytes.
 *
 * Regenerate with: python3 scripts/generate-roadmap.py
 */
export default async function RoadmapPage() {
  const unlocked = await viewerHasResourceAccess();

  return (
    <JournalShell>
      <div className="mx-auto max-w-[960px]">
        <p className="text-[12px] font-semibold tracking-[0.08em] text-[var(--brand-forest)]">
          THE ROADMAP
        </p>
        <h1 className="font-display mt-3 max-w-[20ch] text-[36px] font-bold leading-[1.1] tracking-tight md:text-[42px]">
          How to become a private chef.
        </h1>

        <div className="mt-6 max-w-[52ch] space-y-4 text-[18px] leading-relaxed text-[var(--brand-ink-muted)]">
          <p>
            I didn&apos;t have a map for this. I left restaurants because I was
            getting married and I wanted my evenings back, and I worked the rest
            out one dinner at a time. Some of it took years longer than it needed
            to.
          </p>
          {unlocked ? (
            <>
              <p>
                This is the map I would have wanted. Seven steps, in order. Under
                each one is the thing that has to be true before you move to the
                next. Not a feeling. Something you can actually check.
              </p>
              <p>
                Most people stall at step two. They wait for a perfect posting
                instead of texting someone they already know. Don&apos;t wait. The
                first dinner is school.
              </p>
              <p className="text-[15px] text-[var(--brand-ink-subtle)]">
                Jordan
              </p>
            </>
          ) : null}
        </div>

        {unlocked ? (
          <>
            <div className="mt-10 flex justify-center rounded-2xl bg-[var(--brand-cream)] px-3 py-6 md:px-8 md:py-10">
              {/* unoptimized: the optimizer fetches without the viewer's cookies and would 404. */}
              <Image
                src={ROADMAP_DOWNLOAD_PATH}
                alt="A seven-step roadmap from restaurant kitchens to paid private clients. Step 1: get three to five years of restaurant experience. Step 2: reach out to your whole network. Step 3: book your first dinner with someone you know, charging only for groceries. Step 4: document everything with photos and video. Step 5: repeat at least five more times before charging. Step 6: keep booking clients until referrals drive your business. Step 7: use private chef agencies to expand your reach."
                width={480}
                height={2058}
                className="h-auto w-full max-w-[480px]"
                priority
                unoptimized
              />
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
              <a
                href={ROADMAP_DOWNLOAD_PATH}
                download="private-chef-roadmap.svg"
                className="text-[14px] font-semibold text-[var(--brand-forest)] underline-offset-2 hover:underline"
              >
                Download the roadmap ↓
              </a>
              <Link
                href="/journal"
                className="text-[14px] font-semibold text-[var(--brand-forest)] underline-offset-2 hover:underline"
              >
                Read the journal →
              </Link>
              <Link
                href="/apply"
                className="text-[14px] font-semibold text-[var(--brand-forest)] underline-offset-2 hover:underline"
              >
                Join the Next Brigade Cohort →
              </Link>
            </div>
          </>
        ) : (
          <div className="mt-10">
            <ResourceGate
              resourceSlug="roadmap"
              kicker="SEE THE MAP"
              heading="Leave your email to open the roadmap."
              submitLabel="Open the roadmap"
            />
          </div>
        )}
      </div>
    </JournalShell>
  );
}
