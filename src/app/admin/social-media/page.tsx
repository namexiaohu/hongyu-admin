import { SocialMediaEditor } from '@/components/social-media/social-media-editor';
import { getAdminSocialMedia } from '@/server/admin/social-media';
import { getActiveAdminSiteLanguages } from '@/server/admin/languages';

export default async function AdminSocialMediaPage() {
  const [profile, activeLanguages] = await Promise.all([
    getAdminSocialMedia(),
    getActiveAdminSiteLanguages(),
  ]);

  return <SocialMediaEditor initialProfile={profile} activeLanguages={activeLanguages} />;
}
