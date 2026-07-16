"use client";

import { useState } from "react";
import Link from "next/link";
import { WaitlistForm } from "@/components/waitlist/waitlist-form";

export default function WaitlistPage() {
  const [joined, setJoined] = useState(false);

  return (
    <div className="flex min-h-dvh flex-col bg-gold text-ink">
      <header className="flex h-12 shrink-0 items-center px-4 pt-[env(safe-area-inset-top)]">
        <Link
          href="/"
          className="font-display text-xl font-black tracking-tight text-ink"
        >
          Brigade
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-10 pb-[max(2.5rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-16">
        <div className="w-full max-w-xl text-center">
          {!joined && (
            <h1 className="font-display text-[clamp(40px,12vw,96px)] font-black leading-[0.9] tracking-tight">
              Join
              <br />
              <span className="italic font-semibold">Brigade.</span>
            </h1>
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
