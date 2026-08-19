import { Suspense } from 'react';

import { SummitListClient } from '@/components/summits/summit-list-client';
import { getActiveAdminSiteLanguages } from '@/server/admin/languages';
import { getAdminSummitList } from '@/server/admin/summits';

export default async function SummitsAdminPage() {
  const [list, activeLanguages] = await Promise.all([
    getAdminSummitList(),
    getActiveAdminSiteLanguages(),
  ]);

  return (
    <Suspense fallback={null}>
      <SummitListClient initialList={list} activeLanguages={activeLanguages} />
    </Suspense>
  );
}
