import { Suspense } from 'react';

import { SolutionListClient } from '@/components/solutions/solution-list-client';
import { getAdminCategoryTree } from '@/server/admin/categories';
import { getActiveAdminSiteLanguages } from '@/server/admin/languages';
import { getEnabledProductBoardOptions } from '@/server/admin/product-boards';
import { getAdminSolutionList } from '@/server/admin/solutions';

export default async function SolutionsAdminPage() {
  const [list, activeLanguages, boardOptions, categoryTree] = await Promise.all([
    getAdminSolutionList(),
    getActiveAdminSiteLanguages(),
    getEnabledProductBoardOptions(),
    getAdminCategoryTree(),
  ]);

  return (
    <Suspense fallback={null}>
      <SolutionListClient
        initialList={list}
        activeLanguages={activeLanguages}
        boardOptions={boardOptions}
        categoryTree={categoryTree}
      />
    </Suspense>
  );
}
