/**
 * Recalculate certificate progress using lesson counts.
 *
 * Usage: pnpm exec tsx scripts/backfill-certificate-progress.ts
 */
import '@/lib/env';

import { and, eq, inArray } from 'drizzle-orm';

import { db } from '@/server/db';
import {
  academyCertificateCourseProgress,
  academyCertificateCourses,
  academyCertificateProgress,
  academyCertificates,
  academyCourses,
  academyLessonCompletions,
  academyLessons,
  academyUnits,
} from '@/server/db/schema';

async function countLessons(userId: string, certificateId: string) {
  const courseRows = await db
    .select({ courseId: academyCertificateCourses.courseId })
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

  const lessonIds: string[] = [];
  for (const { courseId } of courseRows) {
    const unitRows = await db.select({ id: academyUnits.id }).from(academyUnits).where(eq(academyUnits.courseId, courseId));
    const unitIds = unitRows.map((row) => row.id);
    if (!unitIds.length) continue;
    const rows = await db
      .select({ id: academyLessons.id })
      .from(academyLessons)
      .where(inArray(academyLessons.unitId, unitIds));
    lessonIds.push(...rows.map((row) => row.id));
  }

  const uniqueLessonIds = [...new Set(lessonIds)];
  const totalLessons = uniqueLessonIds.length;
  if (!totalLessons) return { totalLessons: 0, completedLessons: 0 };

  const completedRows = await db
    .select({ lessonId: academyLessonCompletions.lessonId })
    .from(academyLessonCompletions)
    .where(and(eq(academyLessonCompletions.userId, userId), inArray(academyLessonCompletions.lessonId, uniqueLessonIds)));

  return { totalLessons, completedLessons: completedRows.length };
}

async function resync(userId: string, certificateId: string) {
  const { totalLessons, completedLessons } = await countLessons(userId, certificateId);
  const progressPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
  const now = new Date();

  await db
    .insert(academyCertificateProgress)
    .values({
      userId,
      certificateId,
      completedLessonCount: completedLessons,
      totalLessonCount: totalLessons,
      progressPercent,
      startedAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [academyCertificateProgress.userId, academyCertificateProgress.certificateId],
      set: {
        completedLessonCount: completedLessons,
        totalLessonCount: totalLessons,
        progressPercent,
        updatedAt: now,
      },
    });

  return { completedLessons, totalLessons, progressPercent };
}

async function main() {
  const progressRows = await db
    .select({
      userId: academyCertificateProgress.userId,
      certificateId: academyCertificateProgress.certificateId,
    })
    .from(academyCertificateProgress);

  const touchRows = await db
    .select({
      userId: academyCertificateCourseProgress.userId,
      certificateId: academyCertificateCourses.certificateId,
    })
    .from(academyCertificateCourseProgress)
    .innerJoin(
      academyCertificateCourses,
      eq(academyCertificateCourses.id, academyCertificateCourseProgress.certificateCourseId),
    );

  const pairs = new Map<string, { userId: string; certificateId: string }>();
  for (const row of [...progressRows, ...touchRows]) {
    pairs.set(`${row.userId}:${row.certificateId}`, row);
  }

  for (const row of pairs.values()) {
    const snapshot = await resync(row.userId, row.certificateId);
    console.log(
      `[backfill] ${row.userId.slice(0, 8)}… cert=${row.certificateId.slice(0, 8)}… ` +
        `${snapshot.completedLessons}/${snapshot.totalLessons} (${snapshot.progressPercent}%)`,
    );
  }

  console.log(`[backfill] Done. Resynced ${pairs.size} user×certificate row(s).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
