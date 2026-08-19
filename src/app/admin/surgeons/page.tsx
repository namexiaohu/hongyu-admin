import { Suspense } from 'react';

import { SurgeonListClient } from '@/components/surgeons/surgeon-list-client';
import { getActiveAdminSiteLanguages } from '@/server/admin/languages';
import { getAdminSurgeonList } from '@/server/admin/surgeons';

export default async function SurgeonsAdminPage() {
  const [list, activeLanguages] = await Promise.all([
    getAdminSurgeonList(),
    getActiveAdminSiteLanguages(),
  ]);

  return (
    <Suspense fallback={null}>
      <SurgeonListClient initialList={list} activeLanguages={activeLanguages} />
    </Suspense>
  );
}
