import { Suspense } from 'react';

import { AdminEditorialClient } from './editorial-client';

import { parseAdminListQuery } from '@/lib/admin-list-query';
import { resolveEnabledBoardKey } from '@/lib/editorial-content';
import { getAdminEditorialContentListPaginated } from '@/server/admin/editorial-content';
import { getAdminEditorialDashboard } from '@/server/admin/editorial';
import { getActiveAdminSiteLanguages } from '@/server/admin/languages';

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

async function EditorialPageContent({ searchParams }: PageProps) {
  const [dashboard, activeLanguages, params] = await Promise.all([
    getAdminEditorialDashboard(),
    getActiveAdminSiteLanguages(),
    searchParams,
  ]);

  const defaultBoard = resolveEnabledBoardKey(dashboard.coverage);
  const initialQuery = parseAdminListQuery(params, { defaultBoard });
  const boardKey = resolveEnabledBoardKey(dashboard.coverage, initialQuery.board);
  const initialList = await getAdminEditorialContentListPaginated({
    contentModule: 'editorial',
    boardKey: boardKey || defaultBoard,
    keyword: initialQuery.keyword || undefined,
    page: initialQuery.page,
    pageSize: initialQuery.pageSize,
    knownBoardKeys: dashboard.coverage.map((board) => board.key),
  });

  return (
    <AdminEditorialClient
      initialDashboard={dashboard}
      initialList={initialList}
      initialQuery={{ ...initialQuery, board: boardKey || defaultBoard }}
      activeLanguages={activeLanguages}
    />
  );
}

export default function AdminEditorialPage({ searchParams }: PageProps) {
  return (
    <Suspense fallback={null}>
      <EditorialPageContent searchParams={searchParams} />
    </Suspense>
  );
}
