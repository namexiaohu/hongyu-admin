import { getActiveAdminSiteLanguages } from '@/server/admin/languages';
import { getAdminProductBoardsDashboard } from '@/server/admin/product-boards';

import { AdminProductBoardsClient } from './product-boards-client';

export default async function AdminProductBoardsPage() {
  const [dashboard, activeLanguages] = await Promise.all([
    getAdminProductBoardsDashboard(),
    getActiveAdminSiteLanguages(),
  ]);
  return <AdminProductBoardsClient initialDashboard={dashboard} activeLanguages={activeLanguages} />;
}
