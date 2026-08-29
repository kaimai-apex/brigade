import type { Metadata } from "next";
import { Suspense } from "react";
import { JournalShell } from "@/components/journal/journal-shell";
import { LearnHub } from "@/components/learn/learn-hub";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Learn · Brigade",
  description:
    "Free private chef guides, Jordan's roadmap, and the path into the Brigade cohort.",
  robots: { index: false, follow: false },
};

export default function LearnPage() {
  return (
    <JournalShell signedIn>
      <Suspense fallback={null}>
        <LearnHub />
      </Suspense>
    </JournalShell>
  );
}
