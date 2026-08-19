import { Suspense } from 'react';

import { PartnerCenterListClient } from '@/components/partner-centers/partner-center-list-client';
import { getActiveAdminSiteLanguages } from '@/server/admin/languages';
import { getAdminPartnerCenterList } from '@/server/admin/partner-centers';

export default async function PartnerCentersAdminPage() {
  const [list, activeLanguages] = await Promise.all([
    getAdminPartnerCenterList(),
    getActiveAdminSiteLanguages(),
  ]);

  return (
    <Suspense fallback={null}>
      <PartnerCenterListClient initialList={list} activeLanguages={activeLanguages} />
    </Suspense>
  );
}
