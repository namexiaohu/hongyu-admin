import { AdminUiStringsClient } from '../ui-strings/ui-strings-client';
import { getUiStringsManifestUrl } from '@/server/admin/ui-strings';

export default function AdminCourseUiStringsPage() {
  const manifestUrl = getUiStringsManifestUrl('course');
  return (
    <AdminUiStringsClient
      title="课程站文案翻译"
      manifestUrl={manifestUrl}
      apiBase="/api/admin/course-ui-strings"
    />
  );
}
