"use client";

import { useEffect, useRef, useState } from "react";
import { playCue } from "@/lib/onboarding/sound";
import { burstCelebration } from "@/lib/waitlist/celebrate";

/**
 * The end of the corridor.
 *
 * Fifteen questions deserve an ending, and this is the one moment in the flow
 * where a celebration is not a bribe for doing something trivial — the work is
 * genuinely finished, and what follows is the thing they came for.
 *
 * The bar fills the last stretch on arrival rather than rendering full. It is
 * the same distance the previous fourteen answers moved it, so the gesture
 * that has meant "that worked" all the way down the flow is what says it is
 * over.
 *
 * Once per visit, not once per render: a refresh, a back button or a React
 * remount must not throw confetti at someone re-reading their matches.
 */

const SEEN_KEY = "brigade:onboarding-celebrated";

/**
 * Whether this tab has already celebrated, held outside React.
 *
 * The obvious version of this — read a flag, write it, then celebrate — is
 * silently broken in development and was: React's StrictMode mounts, unmounts
 * and remounts every effect to surface exactly this kind of bug. The first pass
 * wrote the flag and scheduled the burst, its cleanup cancelled the burst, and
 * the second pass read its own flag and stayed quiet. The celebration never
 * happened, and it would have started working on its own in production, which
 * is the worst way to find out.
 *
 * So the flag is written when the burst actually fires, never before, and this
 * module-scoped boolean carries the "already done" fact across a remount that
 * sessionStorage must not be used to describe.
 */
let celebratedInThisTab = false;

export function CompletionCelebration({ label }: { label: string }) {
  const anchor = useRef<HTMLDivElement>(null);
  // Starts where the last question left it, so the fill is a continuation.
  const [percent, setPercent] = useState(95);

  useEffect(() => {
    const timers: number[] = [];

    // A frame, not a delay: the element has to be painted at 95% before the
    // transition to 100% has anything to animate from.
    timers.push(window.setTimeout(() => setPercent(100), 60));

    let seen = celebratedInThisTab;
    if (!seen) {
      try {
        seen = window.sessionStorage.getItem(SEEN_KEY) === "yes";
      } catch {
        // Storage blocked. Celebrating twice is a much smaller problem than
        // throwing on the last screen of onboarding.
      }
    }

    if (!seen) {
      // Lands as the bar arrives, so the sound is the bar filling rather than
      // an unexplained noise on page load.
      timers.push(
        window.setTimeout(() => {
          celebratedInThisTab = true;
          try {
            window.sessionStorage.setItem(SEEN_KEY, "yes");
          } catch {
            // See above.
          }
          playCue("complete");
          if (anchor.current) burstCelebration(anchor.current);
        }, 380),
      );
    }

    return () => timers.forEach(window.clearTimeout);
  }, []);

  return (
    <div>
      <p className="text-meta font-semibold text-forest">{label}</p>
      <div
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink/10"
        role="progressbar"
        aria-valuenow={100}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Onboarding progress"
      >
        <div
          className="ob-progress-fill h-full rounded-full bg-forest"
          style={{ width: `${percent}%` }}
        />
      </div>
      {/* The particles come from the middle of the bar. An empty element so the
          burst has an origin without borrowing one from real content. */}
      <div ref={anchor} aria-hidden className="mx-auto h-0 w-px" />
    </div>
  );
}
