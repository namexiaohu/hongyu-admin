import { Suspense } from 'react';

import { AdminOtherContentClient } from './other-content-client';

import { parseAdminListQuery } from '@/lib/admin-list-query';
import { getAdminEditorialContentListPaginated } from '@/server/admin/editorial-content';
import { getActiveAdminSiteLanguages } from '@/server/admin/languages';

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

async function OtherContentPageContent({ searchParams }: PageProps) {
  const [activeLanguages, params] = await Promise.all([
    getActiveAdminSiteLanguages(),
    searchParams,
  ]);

  const initialQuery = parseAdminListQuery(params);
  const initialList = await getAdminEditorialContentListPaginated({
    contentModule: 'other',
    keyword: initialQuery.keyword || undefined,
    page: initialQuery.page,
    pageSize: initialQuery.pageSize,
  });

  return (
    <AdminOtherContentClient
      initialList={initialList}
      initialQuery={initialQuery}
      activeLanguages={activeLanguages}
    />
  );
}

export default function AdminOtherContentPage({ searchParams }: PageProps) {
  return (
    <Suspense fallback={null}>
      <OtherContentPageContent searchParams={searchParams} />
    </Suspense>
  );
}
