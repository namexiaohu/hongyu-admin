import { Suspense } from 'react';

import { SolutionListClient } from '@/components/solutions/solution-list-client';
import { getAdminCategoryTree } from '@/server/admin/categories';
import { getActiveAdminSiteLanguages } from '@/server/admin/languages';
import { getAdminSolutionList } from '@/server/admin/solutions';

export default async function SolutionsAdminPage() {
  const [list, activeLanguages, categoryTree] = await Promise.all([
    getAdminSolutionList(),
    getActiveAdminSiteLanguages(),
    getAdminCategoryTree(),
  ]);

  return (
    <Suspense fallback={null}>
      <SolutionListClient
        initialList={list}
        activeLanguages={activeLanguages}
        categoryTree={categoryTree}
      />
    </Suspense>
  );
}
