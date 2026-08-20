import { CompanyProfileEditor } from '@/components/company/company-profile-editor';
import { getAdminCompanyProfile } from '@/server/admin/company-profile';
import { getActiveAdminSiteLanguages } from '@/server/admin/languages';

export default async function AdminCompanyPage() {
  const [profile, activeLanguages] = await Promise.all([
    getAdminCompanyProfile(),
    getActiveAdminSiteLanguages(),
  ]);

  return <CompanyProfileEditor initialProfile={profile} activeLanguages={activeLanguages} />;
}
