import { Suspense } from 'react';

import { SolutionListClient } from '@/components/solutions/solution-list-client';
import { getActiveAdminSiteLanguages } from '@/server/admin/languages';
import { getEnabledProductBoardOptions } from '@/server/admin/product-boards';
import { getAdminSolutionList } from '@/server/admin/solutions';

export default async function SolutionsAdminPage() {
  const [list, activeLanguages, boardOptions] = await Promise.all([
    getAdminSolutionList(),
    getActiveAdminSiteLanguages(),
    getEnabledProductBoardOptions(),
  ]);

  return (
    <Suspense fallback={null}>
      <SolutionListClient
        initialList={list}
        activeLanguages={activeLanguages}
        boardOptions={boardOptions}
      />
    </Suspense>
  );
}
