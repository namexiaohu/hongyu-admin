import 'server-only';

import { and, eq } from 'drizzle-orm';

import { countLessonProgressForCourse } from '@/server/storefront/academy-course-completion';
import { db } from '@/server/db';
import {
  academyCertificateCourseProgress,
  academyCertificateCourses,
} from '@/server/db/schema';

export type CourseProgressSnapshot = {
  completedLessonCount: number;
  totalLessonCount: number;
  progressPercent: number;
};

export async function syncCourseProgress(userId: string, certificateCourseId: string) {
  const [link] = await db
    .select({ courseId: academyCertificateCourses.courseId })
    .from(academyCertificateCourses)
    .where(eq(academyCertificateCourses.id, certificateCourseId))
    .limit(1);

  if (!link) return null;

  const { totalLessons, completedLessons } = await countLessonProgressForCourse(userId, link.courseId);
  const progressPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
  const now = new Date();

  await db
    .insert(academyCertificateCourseProgress)
    .values({
      userId,
      certificateCourseId,
      completedLessonCount: completedLessons,
      totalLessonCount: totalLessons,
      progressPercent,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [academyCertificateCourseProgress.userId, academyCertificateCourseProgress.certificateCourseId],
      set: {
        completedLessonCount: completedLessons,
        totalLessonCount: totalLessons,
        progressPercent,
        updatedAt: now,
      },
    });

  return {
    completedLessonCount: completedLessons,
    totalLessonCount: totalLessons,
    progressPercent,
  } satisfies CourseProgressSnapshot;
}

export async function syncCourseProgressForCourseId(userId: string, courseId: string) {
  const links = await db
    .select({ id: academyCertificateCourses.id })
    .from(academyCertificateCourses)
    .where(eq(academyCertificateCourses.courseId, courseId));

  const results: CourseProgressSnapshot[] = [];
  for (const link of links) {
    const snapshot = await syncCourseProgress(userId, link.id);
    if (snapshot) results.push(snapshot);
  }
  return results;
}

export async function getCourseProgress(userId: string, certificateCourseId: string) {
  const [row] = await db
    .select({
      completedLessonCount: academyCertificateCourseProgress.completedLessonCount,
      totalLessonCount: academyCertificateCourseProgress.totalLessonCount,
      progressPercent: academyCertificateCourseProgress.progressPercent,
    })
    .from(academyCertificateCourseProgress)
    .where(
      and(
        eq(academyCertificateCourseProgress.userId, userId),
        eq(academyCertificateCourseProgress.certificateCourseId, certificateCourseId),
      ),
    )
    .limit(1);

  if (!row) return null;

  return {
    completedLessonCount: row.completedLessonCount,
    totalLessonCount: row.totalLessonCount,
    progressPercent: row.progressPercent,
  } satisfies CourseProgressSnapshot;
}
