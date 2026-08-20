import type { PropsWithChildren } from 'react';

import { AdminShell } from '@/components/layout/admin-shell';
import { getSiteUrl } from '@/lib/app-urls';
import { getServerSitePreferences } from '@/lib/i18n-server';
import { buildMetadata } from '@/lib/seo';
import { ADMIN_PANEL_SUBTITLE, ADMIN_PANEL_TITLE } from '@/lib/site-config';

/** Admin pages depend on live DB data — skip static prerender at build time. */
export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const { locale } = await getServerSitePreferences();
  return buildMetadata({
  title: '管理后台 — VexMotor',
  description: '内部运营管理控制台。',
  path: '/admin',
  noIndex: true,
    locale,
  });
}

export default function AdminLayout({ children }: PropsWithChildren) {
  return (
    <AdminShell
      siteUrl={getSiteUrl()}
      panelTitle={ADMIN_PANEL_TITLE}
      panelSubtitle={ADMIN_PANEL_SUBTITLE}
    >
      {children}
    </AdminShell>
  );
}
