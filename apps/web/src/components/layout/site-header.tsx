'use client';

import { PageHeader } from '@/components/layout/app-shell';

type SiteHeaderProps = {
  showAuth?: boolean;
};

/** @deprecated Use PageHeader or AppPage — kept for gradual migration */
export function SiteHeader(props: SiteHeaderProps) {
  return <PageHeader {...props} />;
}
