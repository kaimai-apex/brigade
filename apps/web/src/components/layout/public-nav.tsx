'use client';

import { MarketingHeader } from '@/components/layout/marketing-header';

type PublicNavProps = {
  showAuth?: boolean;
};

/**
 * Alias of MarketingHeader so older imports cannot drift into a second chrome.
 */
export function PublicNav(_props: PublicNavProps) {
  return <MarketingHeader />;
}
