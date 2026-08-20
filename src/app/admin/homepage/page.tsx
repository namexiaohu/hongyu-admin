import { HomepageConfigEditor } from '@/components/homepage/homepage-config-editor';
import { getAdminHomepageConfig } from '@/server/admin/homepage-config';
import { getActiveAdminSiteLanguages } from '@/server/admin/languages';

export default async function AdminHomepagePage() {
  const [config, activeLanguages] = await Promise.all([
    getAdminHomepageConfig(),
    getActiveAdminSiteLanguages(),
  ]);

  return <HomepageConfigEditor initialConfig={config} activeLanguages={activeLanguages} />;
}
