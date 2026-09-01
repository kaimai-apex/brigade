import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { JournalShell } from "@/components/journal/journal-shell";
import { RoadmapPreview } from "@/components/journal/roadmap-preview";
import { getConnectProSession } from "@/lib/connectpro/server";
import { LEARN_PATH } from "@/lib/learn";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Private Chef Roadmap · Brigade",
  description:
    "Jordan's seven-step roadmap from restaurant kitchens to paid private clients. The first three steps are free.",
};

export default async function RoadmapPage() {
  const session = await getConnectProSession();
  if (session) redirect(`${LEARN_PATH}?focus=roadmap`);

  return (
    <JournalShell>
      <RoadmapPreview />
    </JournalShell>
  );
}
