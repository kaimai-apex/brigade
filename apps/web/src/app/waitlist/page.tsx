"use client";

import { useState } from "react";
import { MarketingHeader } from "@/components/layout/marketing-header";
import { WaitlistForm } from "@/components/waitlist/waitlist-form";
import { NAV_OFFSET_CLASS } from "@/lib/nav";
import { cn } from "@/lib/utils";

const WAITLIST_POINTS = [
  "Build relationships with people you trust.",
  "Learn from experienced professionals.",
  "Create brigades for future opportunities.",
  "Be part of a community that's built to help you grow.",
];

export default function WaitlistPage() {
  const [joined, setJoined] = useState(false);

  return (
    <div className="flex min-h-dvh flex-col bg-gold text-ink">
      <MarketingHeader />

      <main
        className={cn(
          "flex flex-1 items-center justify-center px-4 pb-[max(2.5rem,env(safe-area-inset-bottom))] sm:px-6",
          NAV_OFFSET_CLASS,
        )}
      >
        <div className="w-full max-w-xl text-center">
          {!joined && (
            <>
              <h1 className="font-display text-[clamp(40px,12vw,96px)] font-black leading-[0.9] tracking-tight">
                Join
                <br />
                <span className="italic font-semibold">Brigade.</span>
              </h1>
              <div className="mx-auto mt-6 max-w-md text-left sm:mt-8">
                <p className="font-display text-xl font-black leading-snug tracking-tight sm:text-2xl">
                  Where hospitality comes together.
                </p>
                <ul className="mt-5 space-y-3">
                  {WAITLIST_POINTS.map((line) => (
                    <li
                      key={line}
                      className="border-l-4 border-ink/25 pl-4 text-base font-medium leading-relaxed text-ink/85"
                    >
                      {line}
                    </li>
                  ))}
                </ul>
                <p className="mt-5 text-base font-medium leading-relaxed text-ink/75">
                  Receive updates on Brigade&apos;s progress and be the first to
                  access the beta when it launches. Let&apos;s build the community
                  hospitality deserves.
                </p>
              </div>
            </>
          )}
          <div className={`mx-auto w-full text-left ${joined ? "" : "mt-8 sm:mt-10"}`}>
            <WaitlistForm
              source="waitlist-page"
              onSuccess={() => setJoined(true)}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
