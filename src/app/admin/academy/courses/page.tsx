import { AcademyCourseListClient } from '@/components/academy/academy-course-list-client';
import { getActiveAdminSiteLanguages } from '@/server/admin/languages';
import { getAdminAcademyCourseList } from '@/server/admin/academy-courses';

export default async function AcademyCoursesAdminPage() {
  const [list, activeLanguages] = await Promise.all([
    getAdminAcademyCourseList(),
    getActiveAdminSiteLanguages(),
  ]);

  return <AcademyCourseListClient initialList={list} activeLanguages={activeLanguages} />;
}
