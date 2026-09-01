import 'server-only';

import { and, asc, desc, eq, inArray, isNull } from 'drizzle-orm';

import { normalizeStringTags } from '@/lib/academy-content-shared';
import { resolveStorefrontCoverUrl } from '@/lib/cover-presets';
import { resolveOssAssetUrl } from '@/lib/oss-asset-url';
import { pickTranslationForLocale } from '@/lib/pick-translation-for-display';
import { getDefaultSiteLanguageCode } from '@/server/admin/site-locale';
import { db } from '@/server/db';
import {
  academyCertificateCourseProgress,
  academyCertificateCourses,
  academyCertificateProgress,
  academyCertificateTranslations,
  academyCertificateViews,
  academyCertificates,
  academyCourseTranslations,
  academyCourseViews,
  academyCourses,
  academyLessonTranslations,
  academyLessons,
  academyUnitTranslations,
  academyUnits,
  academyUserCertificates,
  users,
} from '@/server/db/schema';
import {
  academyCourseDetailPath,
  academyLearnPath,
} from '@/server/storefront/academy-certificate-courses';
import { syncCertificateProgress } from '@/server/storefront/academy-certificate-progress';
import {
  academyCertificateExamPath,
  isActiveHomeCertificateStatus,
  resolveCertificateLearningStatus,
  type ActiveCertificateLearningStatus,
} from '@/server/storefront/academy-certificate-learning-shared';
import { getCertificateExamMeta } from '@/server/storefront/academy-exams';

function resolveCover(row: { coverMode: string; coverValue: string; coverImage: string }) {
  return resolveStorefrontCoverUrl({
    mode: row.coverMode,
    value: row.coverValue,
    legacyCoverImageKey: row.coverImage,
    toPublicUrl: resolveOssAssetUrl,
  });
}

function displayName(firstName: string, lastName: string) {
  return `${firstName} ${lastName}`.trim() || firstName || lastName;
}

export type AcademyHomeProgressItem = {
  certificateCourseId: string;
  certificateSlug: string;
  certificateTitle: string;
  courseSlug: string;
  courseTitle: string;
  unitTitle: string;
  lessonTitle: string;
  videoUrl: string;
  durationSeconds: number;
  positionSeconds: number;
  href: string;
  certificateHref: string;
  status: ActiveCertificateLearningStatus;
  progressPercent: number;
  completedLessonCount: number;
  totalLessonCount: number;
  courseIndex: number;
  courseTotal: number;
  continueLearnHref: string;
  exam: { hasExam: boolean; examHref: string | null } | null;
};

export type AcademyHomeDashboard = {
  displayName: string;
  certificateSlug: string;
  certificateTitle: string;
  certificateHref: string;
  courseSlug: string;
  courseTitle: string;
  courseIndex: number;
  courseTotal: number;
  progressPercent: number;
  completedLessonCount: number;
  totalLessonCount: number;
  learnHref: string;
};

export type AcademyHomeCertificateItem = {
  slug: string;
  href: string;
  title: string;
  subtitle: string;
  summary: string;
  coverImage: string;
  skills: string[];
  badgeLabel: string;
};

export type AcademyHomeCourseItem = {
  slug: string;
  title: string;
  subtitle: string;
  coverImage: string;
  href: string;
  certificateTitle: string;
  certificateHref: string;
};

export type AcademyHomeDashboardPayload = {
  displayName: string;
  dashboard: AcademyHomeDashboard | null;
  progressItems: AcademyHomeProgressItem[];
  recentCertificates: AcademyHomeCertificateItem[];
  recentCourses: AcademyHomeCourseItem[];
};

export async function recordCertificateView(userId: string, certificateSlug: string) {
  const [certificate] = await db
    .select({ id: academyCertificates.id })
    .from(academyCertificates)
    .where(and(eq(academyCertificates.slug, certificateSlug), eq(academyCertificates.status, 'published')))
    .limit(1);
  if (!certificate) return { ok: false as const, code: 'NOT_FOUND' as const };

  const now = new Date();
  await db
    .insert(academyCertificateViews)
    .values({ userId, certificateId: certificate.id, viewedAt: now })
    .onConflictDoUpdate({
      target: [academyCertificateViews.userId, academyCertificateViews.certificateId],
      set: { viewedAt: now },
    });
  return { ok: true as const };
}

export async function recordCourseView(userId: string, courseSlug: string) {
  const [course] = await db
    .select({ id: academyCourses.id })
    .from(academyCourses)
    .where(and(eq(academyCourses.slug, courseSlug), eq(academyCourses.status, 'published')))
    .limit(1);
  if (!course) return { ok: false as const, code: 'NOT_FOUND' as const };

  const now = new Date();
  await db
    .insert(academyCourseViews)
    .values({ userId, courseId: course.id, viewedAt: now })
    .onConflictDoUpdate({
      target: [academyCourseViews.userId, academyCourseViews.courseId],
      set: { viewedAt: now },
    });
  return { ok: true as const };
}

export type AcademyWatchProgress = {
  unitId: string;
  lessonId: string;
  positionSeconds: number;
};

export async function touchCourseProgress(
  userId: string,
  certificateCourseId: string,
  watch?: AcademyWatchProgress,
) {
  const [link] = await db
    .select({
      id: academyCertificateCourses.id,
      courseId: academyCertificateCourses.courseId,
      certificateId: academyCertificateCourses.certificateId,
      certificateStatus: academyCertificates.status,
      courseStatus: academyCourses.status,
    })
    .from(academyCertificateCourses)
    .innerJoin(academyCertificates, eq(academyCertificates.id, academyCertificateCourses.certificateId))
    .innerJoin(academyCourses, eq(academyCourses.id, academyCertificateCourses.courseId))
    .where(eq(academyCertificateCourses.id, certificateCourseId))
    .limit(1);

  if (!link || link.certificateStatus !== 'published' || link.courseStatus !== 'published') {
    return { ok: false as const, code: 'NOT_FOUND' as const };
  }

  let unitId: string | undefined;
  let lessonId: string | undefined;
  let positionSeconds: number | undefined;
  if (watch) {
    const [owned] = await db
      .select({ lessonId: academyLessons.id, unitId: academyUnits.id })
      .from(academyLessons)
      .innerJoin(academyUnits, eq(academyUnits.id, academyLessons.unitId))
      .where(
        and(
          eq(academyLessons.id, watch.lessonId),
          eq(academyUnits.id, watch.unitId),
          eq(academyUnits.courseId, link.courseId),
        ),
      )
      .limit(1);
    if (!owned) return { ok: false as const, code: 'NOT_FOUND' as const };
    unitId = owned.unitId;
    lessonId = owned.lessonId;
    positionSeconds = Math.max(0, Math.floor(watch.positionSeconds));
  } else {
    const [existing] = await db
      .select({
        unitId: academyCertificateCourseProgress.unitId,
        lessonId: academyCertificateCourseProgress.lessonId,
        positionSeconds: academyCertificateCourseProgress.positionSeconds,
      })
      .from(academyCertificateCourseProgress)
      .where(
        and(
          eq(academyCertificateCourseProgress.userId, userId),
          eq(academyCertificateCourseProgress.certificateCourseId, certificateCourseId),
        ),
      )
      .limit(1);
    if (existing?.unitId && existing.lessonId) {
      unitId = existing.unitId;
      lessonId = existing.lessonId;
      positionSeconds = Math.max(0, existing.positionSeconds ?? 0);
    } else {
      const first = await firstLessonOfCourse(link.courseId);
      if (first) {
        unitId = first.unitId;
        lessonId = first.lessonId;
        positionSeconds = 0;
      }
    }
  }

  const now = new Date();
  await db
    .insert(academyCertificateCourseProgress)
    .values({
      userId,
      certificateCourseId,
      updatedAt: now,
      ...(unitId && lessonId != null && positionSeconds != null
        ? { unitId, lessonId, positionSeconds }
        : {}),
    })
    .onConflictDoUpdate({
      target: [academyCertificateCourseProgress.userId, academyCertificateCourseProgress.certificateCourseId],
      set: {
        updatedAt: now,
        ...(unitId && lessonId != null && positionSeconds != null
          ? { unitId, lessonId, positionSeconds }
          : {}),
      },
    });

  const { ensureCertificateProgressStarted, syncCertificateProgress } = await import('@/server/storefront/academy-certificate-progress');
  const { syncCourseProgress } = await import('@/server/storefront/academy-course-progress');
  await ensureCertificateProgressStarted(userId, link.certificateId);
  await syncCertificateProgress(userId, link.certificateId);
  await syncCourseProgress(userId, certificateCourseId);
  return { ok: true as const };
}

export async function getCourseWatchProgress(
  userId: string,
  certificateCourseId: string,
): Promise<AcademyWatchProgress | null> {
  const [row] = await db
    .select({
      unitId: academyCertificateCourseProgress.unitId,
      lessonId: academyCertificateCourseProgress.lessonId,
      positionSeconds: academyCertificateCourseProgress.positionSeconds,
    })
    .from(academyCertificateCourseProgress)
    .where(
      and(
        eq(academyCertificateCourseProgress.userId, userId),
        eq(academyCertificateCourseProgress.certificateCourseId, certificateCourseId),
      ),
    )
    .limit(1);
  if (!row?.unitId || !row.lessonId) return null;
  return {
    unitId: row.unitId,
    lessonId: row.lessonId,
    positionSeconds: Math.max(0, row.positionSeconds ?? 0),
  };
}

async function lessonIdsByCourseIds(courseIds: string[]) {
  const map = new Map<string, string[]>();
  if (!courseIds.length) return map;
  const units = await db
    .select({ id: academyUnits.id, courseId: academyUnits.courseId })
    .from(academyUnits)
    .where(inArray(academyUnits.courseId, courseIds));
  const unitIds = units.map((unit) => unit.id);
  if (!unitIds.length) return map;
  const lessons = await db
    .select({
      id: academyLessons.id,
      unitId: academyLessons.unitId,
      durationSeconds: academyLessons.durationSeconds,
    })
    .from(academyLessons)
    .where(inArray(academyLessons.unitId, unitIds));
  const unitCourse = new Map(units.map((unit) => [unit.id, unit.courseId]));
  for (const lesson of lessons) {
    const courseId = unitCourse.get(lesson.unitId);
    if (!courseId) continue;
    const bucket = map.get(courseId) ?? [];
    bucket.push(lesson.id);
    map.set(courseId, bucket);
  }
  return map;
}

type CourseFirstLesson = {
  unitId: string;
  lessonId: string;
  videoUrl: string;
  durationSeconds: number;
};

async function firstLessonOfCourse(courseId: string): Promise<CourseFirstLesson | null> {
  const map = await firstLessonsByCourseIds([courseId]);
  return map.get(courseId) ?? null;
}

async function firstLessonsByCourseIds(courseIds: string[]) {
  const map = new Map<string, CourseFirstLesson>();
  if (!courseIds.length) return map;
  const units = await db
    .select({ id: academyUnits.id, courseId: academyUnits.courseId })
    .from(academyUnits)
    .where(inArray(academyUnits.courseId, courseIds))
    .orderBy(asc(academyUnits.sortOrder));
  const firstUnitByCourse = new Map<string, string>();
  for (const unit of units) {
    if (!firstUnitByCourse.has(unit.courseId)) firstUnitByCourse.set(unit.courseId, unit.id);
  }
  const firstUnitIds = [...firstUnitByCourse.values()];
  if (!firstUnitIds.length) return map;
  const lessons = await db
    .select({
      id: academyLessons.id,
      unitId: academyLessons.unitId,
      videoUrl: academyLessons.videoUrl,
      durationSeconds: academyLessons.durationSeconds,
    })
    .from(academyLessons)
    .where(inArray(academyLessons.unitId, firstUnitIds))
    .orderBy(asc(academyLessons.sortOrder));
  const firstLessonByUnit = new Map<string, (typeof lessons)[number]>();
  for (const lesson of lessons) {
    if (!firstLessonByUnit.has(lesson.unitId)) firstLessonByUnit.set(lesson.unitId, lesson);
  }
  for (const [courseId, unitId] of firstUnitByCourse) {
    const lesson = firstLessonByUnit.get(unitId);
    if (!lesson) continue;
    map.set(courseId, {
      unitId,
      lessonId: lesson.id,
      videoUrl: lesson.videoUrl,
      durationSeconds: lesson.durationSeconds,
    });
  }
  return map;
}

export async function getHomeDashboard(userId: string, locale?: string): Promise<AcademyHomeDashboardPayload> {
  const defaultLocale = await getDefaultSiteLanguageCode();
  const resolvedLocale = locale?.trim() || defaultLocale;

  const [user] = await db
    .select({ firstName: users.firstName, lastName: users.lastName })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const certProgressRows = await db
    .select({
      certificateId: academyCertificateProgress.certificateId,
      certificateSlug: academyCertificates.slug,
    })
    .from(academyCertificateProgress)
    .innerJoin(academyCertificates, eq(academyCertificates.id, academyCertificateProgress.certificateId))
    .leftJoin(
      academyUserCertificates,
      and(
        eq(academyUserCertificates.userId, userId),
        eq(academyUserCertificates.certificateId, academyCertificateProgress.certificateId),
      ),
    )
    .where(
      and(
        eq(academyCertificateProgress.userId, userId),
        eq(academyCertificates.status, 'published'),
        isNull(academyUserCertificates.id),
      ),
    )
    .orderBy(desc(academyCertificateProgress.updatedAt))
    .limit(3);

  const certViewRows = await db
    .select({
      certificateId: academyCertificateViews.certificateId,
      slug: academyCertificates.slug,
      coverImage: academyCertificates.coverImage,
      coverMode: academyCertificates.coverMode,
      coverValue: academyCertificates.coverValue,
    })
    .from(academyCertificateViews)
    .innerJoin(academyCertificates, eq(academyCertificates.id, academyCertificateViews.certificateId))
    .where(and(eq(academyCertificateViews.userId, userId), eq(academyCertificates.status, 'published')))
    .orderBy(desc(academyCertificateViews.viewedAt))
    .limit(4);

  const courseViewRows = await db
    .select({
      courseId: academyCourseViews.courseId,
      slug: academyCourses.slug,
      coverImage: academyCourses.coverImage,
      coverMode: academyCourses.coverMode,
      coverValue: academyCourses.coverValue,
    })
    .from(academyCourseViews)
    .innerJoin(academyCourses, eq(academyCourses.id, academyCourseViews.courseId))
    .where(and(eq(academyCourseViews.userId, userId), eq(academyCourses.status, 'published')))
    .orderBy(desc(academyCourseViews.viewedAt))
    .limit(4);

  const recentCourseIds = courseViewRows.map((row) => row.courseId);
  const recentLinks = recentCourseIds.length
    ? await db
        .select({
          id: academyCertificateCourses.id,
          courseId: academyCertificateCourses.courseId,
          certificateId: academyCertificateCourses.certificateId,
          certificateSlug: academyCertificates.slug,
          sortOrder: academyCertificateCourses.sortOrder,
        })
        .from(academyCertificateCourses)
        .innerJoin(academyCertificates, eq(academyCertificates.id, academyCertificateCourses.certificateId))
        .where(
          and(
            inArray(academyCertificateCourses.courseId, recentCourseIds),
            eq(academyCertificates.status, 'published'),
          ),
        )
        .orderBy(academyCertificateCourses.sortOrder)
    : [];

  const firstLinkByCourse = new Map<string, (typeof recentLinks)[number]>();
  for (const link of recentLinks) {
    if (!firstLinkByCourse.has(link.courseId)) firstLinkByCourse.set(link.courseId, link);
  }

  const certificateIds = [
    ...new Set([
      ...certProgressRows.map((row) => row.certificateId),
      ...certViewRows.map((row) => row.certificateId),
      ...[...firstLinkByCourse.values()].map((link) => link.certificateId),
    ]),
  ];

  const certCourseLinks = certProgressRows.length
    ? await db
        .select({
          id: academyCertificateCourses.id,
          certificateId: academyCertificateCourses.certificateId,
          courseId: academyCertificateCourses.courseId,
          sortOrder: academyCertificateCourses.sortOrder,
          courseSlug: academyCourses.slug,
          courseStatus: academyCourses.status,
        })
        .from(academyCertificateCourses)
        .innerJoin(academyCourses, eq(academyCourses.id, academyCertificateCourses.courseId))
        .where(
          and(
            inArray(academyCertificateCourses.certificateId, certProgressRows.map((row) => row.certificateId)),
            eq(academyCourses.status, 'published'),
          ),
        )
        .orderBy(asc(academyCertificateCourses.sortOrder))
    : [];

  const publishedLinksByCert = new Map<string, typeof certCourseLinks>();
  for (const link of certCourseLinks) {
    if (link.courseStatus !== 'published') continue;
    const bucket = publishedLinksByCert.get(link.certificateId) ?? [];
    bucket.push(link);
    publishedLinksByCert.set(link.certificateId, bucket);
  }

  const touchRows = certProgressRows.length
    ? await db
        .select({
          certificateId: academyCertificateCourses.certificateId,
          certificateCourseId: academyCertificateCourseProgress.certificateCourseId,
          courseId: academyCertificateCourses.courseId,
          courseSlug: academyCourses.slug,
          unitId: academyCertificateCourseProgress.unitId,
          lessonId: academyCertificateCourseProgress.lessonId,
          positionSeconds: academyCertificateCourseProgress.positionSeconds,
          updatedAt: academyCertificateCourseProgress.updatedAt,
        })
        .from(academyCertificateCourseProgress)
        .innerJoin(
          academyCertificateCourses,
          eq(academyCertificateCourses.id, academyCertificateCourseProgress.certificateCourseId),
        )
        .innerJoin(academyCourses, eq(academyCourses.id, academyCertificateCourses.courseId))
        .where(
          and(
            eq(academyCertificateCourseProgress.userId, userId),
            inArray(academyCertificateCourses.certificateId, certProgressRows.map((row) => row.certificateId)),
            eq(academyCourses.status, 'published'),
          ),
        )
        .orderBy(desc(academyCertificateCourseProgress.updatedAt))
    : [];

  const latestTouchByCert = new Map<string, (typeof touchRows)[number]>();
  for (const row of touchRows) {
    if (!latestTouchByCert.has(row.certificateId)) latestTouchByCert.set(row.certificateId, row);
  }

  const courseIds = [
    ...new Set([
      ...certCourseLinks.map((link) => link.courseId),
      ...courseViewRows.map((row) => row.courseId),
    ]),
  ];

  const [certTranslations, courseTranslations] = await Promise.all([
    certificateIds.length
      ? db.select().from(academyCertificateTranslations).where(inArray(academyCertificateTranslations.certificateId, certificateIds))
      : Promise.resolve([]),
    courseIds.length
      ? db.select().from(academyCourseTranslations).where(inArray(academyCourseTranslations.courseId, courseIds))
      : Promise.resolve([]),
  ]);

  const certTById = new Map<string, typeof certTranslations>();
  for (const row of certTranslations) {
    const bucket = certTById.get(row.certificateId) ?? [];
    bucket.push(row);
    certTById.set(row.certificateId, bucket);
  }
  const courseTById = new Map<string, typeof courseTranslations>();
  for (const row of courseTranslations) {
    const bucket = courseTById.get(row.courseId) ?? [];
    bucket.push(row);
    courseTById.set(row.courseId, bucket);
  }

  const firstLessonByCourseId = await firstLessonsByCourseIds(
    [...new Set(
      certProgressRows.flatMap((row) => {
        const touch = latestTouchByCert.get(row.certificateId);
        const published = publishedLinksByCert.get(row.certificateId) ?? [];
        const courseIdsForFallback: string[] = [];
        if (touch && (!touch.unitId || !touch.lessonId)) courseIdsForFallback.push(touch.courseId);
        if (!touch && published[0]) courseIdsForFallback.push(published[0].courseId);
        return courseIdsForFallback;
      }),
    )],
  );

  const watchLessonIds = [...new Set(
    certProgressRows.flatMap((row) => {
      const touch = latestTouchByCert.get(row.certificateId);
      const published = publishedLinksByCert.get(row.certificateId) ?? [];
      const ids: string[] = [];
      if (touch?.lessonId) ids.push(touch.lessonId);
      const seeded = touch
        ? firstLessonByCourseId.get(touch.courseId)
        : published[0]
          ? firstLessonByCourseId.get(published[0].courseId)
          : undefined;
      if (seeded) ids.push(seeded.lessonId);
      return ids;
    }),
  )];
  const watchUnitIds = [...new Set(
    certProgressRows.flatMap((row) => {
      const touch = latestTouchByCert.get(row.certificateId);
      const published = publishedLinksByCert.get(row.certificateId) ?? [];
      const ids: string[] = [];
      if (touch?.unitId) ids.push(touch.unitId);
      const seeded = touch
        ? firstLessonByCourseId.get(touch.courseId)
        : published[0]
          ? firstLessonByCourseId.get(published[0].courseId)
          : undefined;
      if (seeded) ids.push(seeded.unitId);
      return ids;
    }),
  )];

  const [watchLessons, watchLessonTranslations, watchUnitTranslations] = await Promise.all([
    watchLessonIds.length
      ? db
          .select({
            id: academyLessons.id,
            unitId: academyLessons.unitId,
            videoUrl: academyLessons.videoUrl,
            durationSeconds: academyLessons.durationSeconds,
          })
          .from(academyLessons)
          .where(inArray(academyLessons.id, watchLessonIds))
      : Promise.resolve([]),
    watchLessonIds.length
      ? db.select().from(academyLessonTranslations).where(inArray(academyLessonTranslations.lessonId, watchLessonIds))
      : Promise.resolve([]),
    watchUnitIds.length
      ? db.select().from(academyUnitTranslations).where(inArray(academyUnitTranslations.unitId, watchUnitIds))
      : Promise.resolve([]),
  ]);

  const lessonById = new Map(watchLessons.map((row) => [row.id, row]));
  const lessonTById = new Map<string, typeof watchLessonTranslations>();
  for (const row of watchLessonTranslations) {
    const bucket = lessonTById.get(row.lessonId) ?? [];
    bucket.push(row);
    lessonTById.set(row.lessonId, bucket);
  }
  const unitTById = new Map<string, typeof watchUnitTranslations>();
  for (const row of watchUnitTranslations) {
    const bucket = unitTById.get(row.unitId) ?? [];
    bucket.push(row);
    unitTById.set(row.unitId, bucket);
  }

  const progressItems: AcademyHomeProgressItem[] = [];

  for (const certRow of certProgressRows) {
    const published = publishedLinksByCert.get(certRow.certificateId) ?? [];
    if (!published.length) continue;

    const certT = pickTranslationForLocale(certTById.get(certRow.certificateId) ?? [], resolvedLocale, defaultLocale);
    const certificateTitle = certT?.title?.trim() || '';
    if (!certificateTitle) continue;

    const progressSnapshot = await syncCertificateProgress(userId, certRow.certificateId);
    const status = resolveCertificateLearningStatus(progressSnapshot, false);
    if (!isActiveHomeCertificateStatus(status)) continue;

    const touch = latestTouchByCert.get(certRow.certificateId);
    const fallbackLink = published[0]!;
    const activeLink = touch
      ? published.find((link) => link.id === touch.certificateCourseId) ?? fallbackLink
      : fallbackLink;
    const courseIndex = published.findIndex((link) => link.id === activeLink.id) + 1;
    if (courseIndex <= 0) continue;

    const seeded = firstLessonByCourseId.get(activeLink.courseId);
    const unitId = touch?.unitId || seeded?.unitId || '';
    const lessonId = touch?.lessonId || seeded?.lessonId || '';
    if (!unitId || !lessonId) continue;

    const lesson = lessonById.get(lessonId);
    if (!lesson || lesson.unitId !== unitId) continue;

    const videoUrl = lesson.videoUrl?.trim() ? resolveOssAssetUrl(lesson.videoUrl) : '';
    if (!videoUrl) continue;

    const courseT = pickTranslationForLocale(courseTById.get(activeLink.courseId) ?? [], resolvedLocale, defaultLocale);
    const unitT = pickTranslationForLocale(unitTById.get(unitId) ?? [], resolvedLocale, defaultLocale);
    const lessonT = pickTranslationForLocale(lessonTById.get(lessonId) ?? [], resolvedLocale, defaultLocale);
    const courseTitle = courseT?.title?.trim() || '';
    const unitTitle = unitT?.title?.trim() || '';
    const lessonTitle = lessonT?.title?.trim() || '';
    if (!courseTitle || !unitTitle || !lessonTitle) continue;

    const learnHref = academyLearnPath(activeLink.courseSlug, activeLink.id);
    const examMeta = await getCertificateExamMeta(certRow.certificateId, resolvedLocale);

    progressItems.push({
      certificateCourseId: activeLink.id,
      certificateSlug: certRow.certificateSlug,
      certificateTitle,
      courseSlug: activeLink.courseSlug,
      courseTitle,
      unitTitle,
      lessonTitle,
      videoUrl,
      durationSeconds: lesson.durationSeconds,
      positionSeconds: Math.max(0, touch?.positionSeconds ?? 0),
      href: learnHref,
      certificateHref: `/certificates/${certRow.certificateSlug}`,
      status,
      progressPercent: progressSnapshot?.progressPercent ?? 0,
      completedLessonCount: progressSnapshot?.completedLessonCount ?? 0,
      totalLessonCount: progressSnapshot?.totalLessonCount ?? 0,
      courseIndex,
      courseTotal: published.length,
      continueLearnHref: learnHref,
      exam: examMeta.hasExam
        ? { hasExam: true, examHref: academyCertificateExamPath(certRow.certificateSlug) }
        : { hasExam: false, examHref: null },
    });
  }

  let dashboard: AcademyHomeDashboard | null = null;
  const featured = progressItems[0];
  if (featured) {
    dashboard = {
      displayName: user ? displayName(user.firstName, user.lastName) : '',
      certificateSlug: featured.certificateSlug,
      certificateTitle: featured.certificateTitle,
      certificateHref: featured.certificateHref,
      courseSlug: featured.courseSlug,
      courseTitle: featured.courseTitle,
      courseIndex: featured.courseIndex,
      courseTotal: featured.courseTotal,
      progressPercent: featured.progressPercent,
      completedLessonCount: featured.completedLessonCount,
      totalLessonCount: featured.totalLessonCount,
      learnHref: featured.continueLearnHref,
    };
  }

  const recentCertificates = certViewRows.flatMap((row) => {
    const t = pickTranslationForLocale(certTById.get(row.certificateId) ?? [], resolvedLocale, defaultLocale);
    const title = t?.title?.trim();
    if (!title) return [];
    const skills = normalizeStringTags(t?.skills ?? []);
    return [{
      slug: row.slug,
      href: `/certificates/${row.slug}`,
      title,
      subtitle: t?.subtitle?.trim() || '',
      summary: t?.summary?.trim() || '',
      coverImage: resolveCover(row),
      skills,
      badgeLabel: t?.badgeLabel?.trim() || '',
    }];
  });

  const recentCourses = courseViewRows.flatMap((row) => {
    const link = firstLinkByCourse.get(row.courseId);
    if (!link) return [];
    const t = pickTranslationForLocale(courseTById.get(row.courseId) ?? [], resolvedLocale, defaultLocale);
    const certT = pickTranslationForLocale(certTById.get(link.certificateId) ?? [], resolvedLocale, defaultLocale);
    const certificateTitle = certT?.title?.trim() || '';
    const subtitle = t?.subtitle?.trim() || '';
    if (!certificateTitle || !subtitle) return [];
    const title = t?.title?.trim() || '';
    if (!title) return [];
    return [{
      slug: row.slug,
      title,
      subtitle,
      coverImage: resolveCover(row),
      href: academyCourseDetailPath(row.slug, link.id),
      certificateTitle,
      certificateHref: `/certificates/${link.certificateSlug}`,
    }];
  });

  return {
    displayName: user ? displayName(user.firstName, user.lastName) : '',
    dashboard,
    progressItems,
    recentCertificates,
    recentCourses,
  };
}
