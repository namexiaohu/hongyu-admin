import 'server-only';

import { and, eq, inArray } from 'drizzle-orm';

import { db } from '@/server/db';
import {
  academyCertificateCourses,
  academyCertificates,
  academyCourses,
  academyLessonCompletions,
  academyLessons,
  academyUnits,
} from '@/server/db/schema';

export async function getAllLessonIdsForCourse(courseId: string) {
  const unitRows = await db
    .select({ id: academyUnits.id })
    .from(academyUnits)
    .where(eq(academyUnits.courseId, courseId));
  const unitIds = unitRows.map((row) => row.id);
  if (!unitIds.length) return [];

  const lessonRows = await db
    .select({ id: academyLessons.id })
    .from(academyLessons)
    .where(inArray(academyLessons.unitId, unitIds));
  return lessonRows.map((row) => row.id);
}

export async function getCompletedLessonIdsForUser(userId: string, lessonIds: string[]) {
  if (!lessonIds.length) return new Set<string>();
  const completed = await db
    .select({ lessonId: academyLessonCompletions.lessonId })
    .from(academyLessonCompletions)
    .where(
      and(
        eq(academyLessonCompletions.userId, userId),
        inArray(academyLessonCompletions.lessonId, lessonIds),
      ),
    );
  return new Set(completed.map((row) => row.lessonId));
}

export async function isCourseCompleteForUser(userId: string, courseId: string) {
  const allLessonIds = await getAllLessonIdsForCourse(courseId);
  if (!allLessonIds.length) return false;
  const completed = await getCompletedLessonIdsForUser(userId, allLessonIds);
  return allLessonIds.every((id) => completed.has(id));
}

export async function getPublishedCertificateCourseIds(certificateId: string) {
  const rows = await db
    .select({
      courseId: academyCertificateCourses.courseId,
    })
    .from(academyCertificateCourses)
    .innerJoin(academyCourses, eq(academyCourses.id, academyCertificateCourses.courseId))
    .innerJoin(academyCertificates, eq(academyCertificates.id, academyCertificateCourses.certificateId))
    .where(
      and(
        eq(academyCertificateCourses.certificateId, certificateId),
        eq(academyCourses.status, 'published'),
        eq(academyCertificates.status, 'published'),
      ),
    );

  return rows.map((row) => row.courseId);
}

export async function countLessonProgressForCourse(userId: string, courseId: string) {
  const allLessonIds = await getAllLessonIdsForCourse(courseId);
  const totalLessons = allLessonIds.length;
  if (!totalLessons) return { totalLessons: 0, completedLessons: 0 };

  const completed = await getCompletedLessonIdsForUser(userId, allLessonIds);
  return { totalLessons, completedLessons: completed.size };
}

export async function countLessonProgressForCertificate(userId: string, certificateId: string) {
  const courseIds = await getPublishedCertificateCourseIds(certificateId);
  if (!courseIds.length) return { totalLessons: 0, completedLessons: 0 };

  const allLessonIds: string[] = [];
  for (const courseId of courseIds) {
    allLessonIds.push(...(await getAllLessonIdsForCourse(courseId)));
  }

  const uniqueLessonIds = [...new Set(allLessonIds)];
  const totalLessons = uniqueLessonIds.length;
  if (!totalLessons) return { totalLessons: 0, completedLessons: 0 };

  const completed = await getCompletedLessonIdsForUser(userId, uniqueLessonIds);
  return { totalLessons, completedLessons: completed.size };
}

export async function countCompletedCoursesForCertificate(userId: string, certificateId: string) {
  const courseIds = await getPublishedCertificateCourseIds(certificateId);
  if (!courseIds.length) return { totalCourses: 0, completedCourses: 0 };

  let completedCourses = 0;
  for (const courseId of courseIds) {
    if (await isCourseCompleteForUser(userId, courseId)) {
      completedCourses += 1;
    }
  }

  return { totalCourses: courseIds.length, completedCourses };
}

export async function isCertificateLearningComplete(userId: string, certificateId: string) {
  const { totalLessons, completedLessons } = await countLessonProgressForCertificate(userId, certificateId);
  return totalLessons > 0 && completedLessons === totalLessons;
}

export async function getCertificateIdsForCourseId(courseId: string) {
  const rows = await db
    .select({ certificateId: academyCertificateCourses.certificateId })
    .from(academyCertificateCourses)
    .where(eq(academyCertificateCourses.courseId, courseId));
  return [...new Set(rows.map((row) => row.certificateId))];
}

export async function getCourseIdForLessonId(lessonId: string) {
  const [row] = await db
    .select({ courseId: academyUnits.courseId })
    .from(academyLessons)
    .innerJoin(academyUnits, eq(academyUnits.id, academyLessons.unitId))
    .where(eq(academyLessons.id, lessonId))
    .limit(1);
  return row?.courseId ?? null;
}
