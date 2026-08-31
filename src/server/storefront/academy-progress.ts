import { and, eq, inArray } from 'drizzle-orm';

import { db } from '@/server/db';
import {
  academyCourses,
  academyLessonCompletions,
  academyLessons,
  academyUnits,
} from '@/server/db/schema';

export async function listCompletedLessonIdsForCourse(userId: string, courseSlug: string) {
  const [course] = await db
    .select({ id: academyCourses.id })
    .from(academyCourses)
    .where(eq(academyCourses.slug, courseSlug))
    .limit(1);

  if (!course) {
    return { courseId: null as string | null, lessonIds: [] as string[] };
  }

  const unitRows = await db
    .select({ id: academyUnits.id })
    .from(academyUnits)
    .where(eq(academyUnits.courseId, course.id));

  const unitIds = unitRows.map((row) => row.id);
  if (!unitIds.length) {
    return { courseId: course.id, lessonIds: [] as string[] };
  }

  const lessonRows = await db
    .select({ id: academyLessons.id })
    .from(academyLessons)
    .where(inArray(academyLessons.unitId, unitIds));

  const lessonIds = lessonRows.map((row) => row.id);
  if (!lessonIds.length) {
    return { courseId: course.id, lessonIds: [] as string[] };
  }

  const completed = await db
    .select({ lessonId: academyLessonCompletions.lessonId })
    .from(academyLessonCompletions)
    .where(
      and(
        eq(academyLessonCompletions.userId, userId),
        inArray(academyLessonCompletions.lessonId, lessonIds),
      ),
    );

  return {
    courseId: course.id,
    lessonIds: completed.map((row) => row.lessonId),
  };
}

export async function markLessonCompleted(userId: string, lessonId: string) {
  const [lesson] = await db
    .select({ id: academyLessons.id })
    .from(academyLessons)
    .where(eq(academyLessons.id, lessonId))
    .limit(1);

  if (!lesson) {
    return { ok: false as const, code: 'NOT_FOUND' as const };
  }

  await db
    .insert(academyLessonCompletions)
    .values({
      userId,
      lessonId,
      completedAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoNothing();

  const { getCourseIdForLessonId } = await import('@/server/storefront/academy-course-completion');
  const { syncCertificateProgressForCourse } = await import('@/server/storefront/academy-certificate-progress');
  const { syncCourseProgressForCourseId } = await import('@/server/storefront/academy-course-progress');
  const courseId = await getCourseIdForLessonId(lessonId);
  if (courseId) {
    await syncCertificateProgressForCourse(userId, courseId);
    await syncCourseProgressForCourseId(userId, courseId);
  }

  return { ok: true as const };
}
