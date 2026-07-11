import { ServerAppPage } from '@/components/layout/server-app-page';
import { ExploreSectionNav } from '@/components/explore/explore-section-nav';

export default function ExploreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ServerAppPage className="pb-20">
      <ExploreSectionNav />
      {children}
    </ServerAppPage>
  );
}
