import { Suspense } from 'react';

import { AcademyCertificateListClient } from '@/components/academy/academy-certificate-list-client';
import { getActiveAdminSiteLanguages } from '@/server/admin/languages';
import { getAdminAcademyCertificateList } from '@/server/admin/academy-certificates';

export default async function AcademyCertificatesAdminPage() {
  const [list, activeLanguages] = await Promise.all([
    getAdminAcademyCertificateList(),
    getActiveAdminSiteLanguages(),
  ]);

  return (
    <Suspense fallback={null}>
      <AcademyCertificateListClient initialList={list} activeLanguages={activeLanguages} />
    </Suspense>
  );
}
