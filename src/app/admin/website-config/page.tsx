import { WebsiteConfigEditor } from '@/components/website-config/website-config-editor';
import { getActiveAdminSiteLanguages } from '@/server/admin/languages';
import { getAdminWebsiteConfig } from '@/server/admin/website-config';

export default async function AdminWebsiteConfigPage() {
  const [config, activeLanguages] = await Promise.all([
    getAdminWebsiteConfig(),
    getActiveAdminSiteLanguages(),
  ]);

  return <WebsiteConfigEditor initialConfig={config} activeLanguages={activeLanguages} />;
}
