import { AdminEditorialBoardsClient } from './boards-client';

import { getAdminEditorialContentList } from '@/server/admin/editorial-content';
import { getAdminEditorialDashboard } from '@/server/admin/editorial';
import { getActiveAdminSiteLanguages } from '@/server/admin/languages';

export default async function AdminEditorialBoardsPage() {
  const [dashboard, entries, activeLanguages] = await Promise.all([
    getAdminEditorialDashboard(),
    getAdminEditorialContentList(),
    getActiveAdminSiteLanguages(),
  ]);

  return (
    <AdminEditorialBoardsClient
      initialDashboard={dashboard}
      initialEntries={entries}
      activeLanguages={activeLanguages}
    />
  );
}
