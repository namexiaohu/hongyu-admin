import { Suspense } from 'react';

import { BrandNarrativeListClient } from '@/components/brand-narratives/brand-narrative-list-client';
import { getAdminBrandNarrativeList } from '@/server/admin/brand-narratives';
import { getActiveAdminSiteLanguages } from '@/server/admin/languages';

export default async function BrandNarrativesPage() {
  const [list, activeLanguages] = await Promise.all([
    getAdminBrandNarrativeList(),
    getActiveAdminSiteLanguages(),
  ]);

  return (
    <Suspense fallback={null}>
      <BrandNarrativeListClient initialList={list} activeLanguages={activeLanguages} />
    </Suspense>
  );
}
