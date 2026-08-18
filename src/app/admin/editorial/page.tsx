import { Suspense } from 'react';

import { AdminEditorialClient } from './editorial-client';

import { parseAdminListQuery } from '@/lib/admin-list-query';
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

  const boardKeys = new Set(dashboard.coverage.map((board) => board.key));
  const defaultBoard = dashboard.coverage[0]?.key ?? '';
  const initialQuery = parseAdminListQuery(params, { defaultBoard });
  const boardKey = initialQuery.board && boardKeys.has(initialQuery.board) ? initialQuery.board : defaultBoard;
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
