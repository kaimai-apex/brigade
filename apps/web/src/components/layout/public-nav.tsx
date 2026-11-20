'use client';

import { MarketingHeader } from '@/components/layout/marketing-header';

/**
 * Alias of MarketingHeader so older imports cannot drift into a second chrome.
 */
export function PublicNav() {
  return <MarketingHeader />;
}
