import { Suspense } from 'react';

import { MarketEventListClient } from '@/components/market-events/market-event-list-client';
import { getActiveAdminSiteLanguages } from '@/server/admin/languages';
import { getAdminMarketEventList } from '@/server/admin/market-events';

export default async function MarketEventsAdminPage() {
  const [list, activeLanguages] = await Promise.all([
    getAdminMarketEventList(),
    getActiveAdminSiteLanguages(),
  ]);

  return (
    <Suspense fallback={null}>
      <MarketEventListClient initialList={list} activeLanguages={activeLanguages} />
    </Suspense>
  );
}
