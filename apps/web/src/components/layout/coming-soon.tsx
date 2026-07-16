import Link from "next/link";
import { ServerAppPage } from "@/components/layout/server-app-page";
import { Button } from "@/components/ui/button";

export function ComingSoon({
  title,
  description = "Currently under development. Check back soon.",
}: {
  title: string;
  description?: string;
}) {
  return (
    <ServerAppPage className="pb-4 pt-4">
      <div className="mx-auto flex max-w-lg flex-col items-start gap-4 py-10 sm:py-16">
        <p className="font-marker text-xl text-rust">Coming soon</p>
        <h1 className="text-page-title">{title}</h1>
        <p className="text-body-md text-ink/65">{description}</p>
        <Button asChild className="mt-2">
          <Link href="/feed">Back to Feed</Link>
        </Button>
      </div>
    </ServerAppPage>
  );
}
