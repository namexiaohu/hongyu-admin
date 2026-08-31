import 'server-only';

import { and, eq } from 'drizzle-orm';

import { countLessonProgressForCertificate } from '@/server/storefront/academy-course-completion';
import { db } from '@/server/db';
import { academyCertificateProgress } from '@/server/db/schema';

export type CertificateProgressSnapshot = {
  completedLessonCount: number;
  totalLessonCount: number;
  progressPercent: number;
  startedAt: string;
  updatedAt: string;
};

export async function syncCertificateProgress(userId: string, certificateId: string) {
  const [existing] = await db
    .select({
      id: academyCertificateProgress.id,
      startedAt: academyCertificateProgress.startedAt,
      completedLessonCount: academyCertificateProgress.completedLessonCount,
      totalLessonCount: academyCertificateProgress.totalLessonCount,
      progressPercent: academyCertificateProgress.progressPercent,
    })
    .from(academyCertificateProgress)
    .where(
      and(
        eq(academyCertificateProgress.userId, userId),
        eq(academyCertificateProgress.certificateId, certificateId),
      ),
    )
    .limit(1);

  const { totalLessons, completedLessons } = await countLessonProgressForCertificate(userId, certificateId);
  const isFullyComplete = Boolean(
    existing
    && existing.totalLessonCount > 0
    && existing.completedLessonCount >= existing.totalLessonCount
    && existing.progressPercent >= 100,
  );

  let completedLessonCount = completedLessons;
  let totalLessonCount = totalLessons;
  let progressPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  if (isFullyComplete) {
    completedLessonCount = existing!.completedLessonCount;
    totalLessonCount = existing!.totalLessonCount;
    progressPercent = 100;
  } else if (totalLessonCount > 0 && completedLessonCount >= totalLessonCount) {
    progressPercent = 100;
  }

  const now = new Date();

  if (!existing && completedLessonCount === 0 && totalLessonCount === 0) {
    return null;
  }

  const [row] = await db
    .insert(academyCertificateProgress)
    .values({
      userId,
      certificateId,
      completedLessonCount,
      totalLessonCount,
      progressPercent,
      startedAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [academyCertificateProgress.userId, academyCertificateProgress.certificateId],
      set: {
        completedLessonCount,
        totalLessonCount,
        progressPercent,
        updatedAt: now,
      },
    })
    .returning();

  return {
    completedLessonCount: row.completedLessonCount,
    totalLessonCount: row.totalLessonCount,
    progressPercent: row.progressPercent,
    startedAt: row.startedAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  } satisfies CertificateProgressSnapshot;
}

export async function syncCertificateProgressForCourse(userId: string, courseId: string) {
  const { getCertificateIdsForCourseId } = await import('@/server/storefront/academy-course-completion');
  const certificateIds = await getCertificateIdsForCourseId(courseId);
  const results: CertificateProgressSnapshot[] = [];
  for (const certificateId of certificateIds) {
    const snapshot = await syncCertificateProgress(userId, certificateId);
    if (snapshot) results.push(snapshot);
  }
  return results;
}

export async function getCertificateProgress(userId: string, certificateId: string) {
  const [row] = await db
    .select()
    .from(academyCertificateProgress)
    .where(
      and(
        eq(academyCertificateProgress.userId, userId),
        eq(academyCertificateProgress.certificateId, certificateId),
      ),
    )
    .limit(1);

  if (!row) return null;

  return {
    completedLessonCount: row.completedLessonCount,
    totalLessonCount: row.totalLessonCount,
    progressPercent: row.progressPercent,
    startedAt: row.startedAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  } satisfies CertificateProgressSnapshot;
}

export async function ensureCertificateProgressStarted(userId: string, certificateId: string) {
  const snapshot = await syncCertificateProgress(userId, certificateId);
  if (snapshot) return snapshot;

  const now = new Date();
  const [row] = await db
    .insert(academyCertificateProgress)
    .values({
      userId,
      certificateId,
      completedLessonCount: 0,
      totalLessonCount: 0,
      progressPercent: 0,
      startedAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [academyCertificateProgress.userId, academyCertificateProgress.certificateId],
      set: { updatedAt: now },
    })
    .returning();

  const { totalLessons, completedLessons } = await countLessonProgressForCertificate(userId, certificateId);
  const progressPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  const [updated] = await db
    .update(academyCertificateProgress)
    .set({
      completedLessonCount: completedLessons,
      totalLessonCount: totalLessons,
      progressPercent,
      updatedAt: now,
    })
    .where(eq(academyCertificateProgress.id, row.id))
    .returning();

  return {
    completedLessonCount: updated.completedLessonCount,
    totalLessonCount: updated.totalLessonCount,
    progressPercent: updated.progressPercent,
    startedAt: updated.startedAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  } satisfies CertificateProgressSnapshot;
}
