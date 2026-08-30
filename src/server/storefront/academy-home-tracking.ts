import 'server-only';

import { and, asc, desc, eq, inArray } from 'drizzle-orm';

import { normalizeStringTags } from '@/lib/academy-content-shared';
import { resolveStorefrontCoverUrl } from '@/lib/cover-presets';
import { resolveOssAssetUrl } from '@/lib/oss-asset-url';
import { pickTranslationForDisplay } from '@/lib/pick-translation-for-display';
import { getDefaultSiteLanguageCode } from '@/server/admin/site-locale';
import { db } from '@/server/db';
import {
  academyCertificateCourseProgress,
  academyCertificateCourses,
  academyCertificateTranslations,
  academyCertificateViews,
  academyCertificates,
  academyCourseTranslations,
  academyCourseViews,
  academyCourses,
  academyLessonCompletions,
  academyLessonTranslations,
  academyLessons,
  academyUnitTranslations,
  academyUnits,
  users,
} from '@/server/db/schema';
import {
  academyCourseDetailPath,
  academyLearnPath,
} from '@/server/storefront/academy-certificate-courses';

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
      })
      .from(academyCertificateCourseProgress)
      .where(
        and(
          eq(academyCertificateCourseProgress.userId, userId),
          eq(academyCertificateCourseProgress.certificateCourseId, certificateCourseId),
        ),
      )
      .limit(1);
    if (!existing?.unitId || !existing.lessonId) {
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
  const resolvedLocale = locale?.trim() || await getDefaultSiteLanguageCode();

  const [user] = await db
    .select({ firstName: users.firstName, lastName: users.lastName })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const progressRows = await db
    .select({
      certificateCourseId: academyCertificateCourseProgress.certificateCourseId,
      updatedAt: academyCertificateCourseProgress.updatedAt,
      unitId: academyCertificateCourseProgress.unitId,
      lessonId: academyCertificateCourseProgress.lessonId,
      positionSeconds: academyCertificateCourseProgress.positionSeconds,
      certificateId: academyCertificateCourses.certificateId,
      courseId: academyCertificateCourses.courseId,
      sortOrder: academyCertificateCourses.sortOrder,
      certificateSlug: academyCertificates.slug,
      certificateCoverImage: academyCertificates.coverImage,
      certificateCoverMode: academyCertificates.coverMode,
      certificateCoverValue: academyCertificates.coverValue,
      courseSlug: academyCourses.slug,
      courseCoverImage: academyCourses.coverImage,
      courseCoverMode: academyCourses.coverMode,
      courseCoverValue: academyCourses.coverValue,
    })
    .from(academyCertificateCourseProgress)
    .innerJoin(
      academyCertificateCourses,
      eq(academyCertificateCourses.id, academyCertificateCourseProgress.certificateCourseId),
    )
    .innerJoin(academyCertificates, eq(academyCertificates.id, academyCertificateCourses.certificateId))
    .innerJoin(academyCourses, eq(academyCourses.id, academyCertificateCourses.courseId))
    .where(
      and(
        eq(academyCertificateCourseProgress.userId, userId),
        eq(academyCertificates.status, 'published'),
        eq(academyCourses.status, 'published'),
      ),
    )
    .orderBy(desc(academyCertificateCourseProgress.updatedAt))
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
      ...progressRows.map((row) => row.certificateId),
      ...certViewRows.map((row) => row.certificateId),
      ...[...firstLinkByCourse.values()].map((link) => link.certificateId),
    ]),
  ];
  const courseIds = [
    ...new Set([
      ...progressRows.map((row) => row.courseId),
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
    [...new Set(progressRows.filter((row) => !row.unitId || !row.lessonId).map((row) => row.courseId))],
  );

  const watchLessonIds = [...new Set(
    progressRows.flatMap((row) => {
      const ids: string[] = [];
      if (row.lessonId) ids.push(row.lessonId);
      const seeded = firstLessonByCourseId.get(row.courseId);
      if (seeded) ids.push(seeded.lessonId);
      return ids;
    }),
  )];
  const watchUnitIds = [...new Set(
    progressRows.flatMap((row) => {
      const ids: string[] = [];
      if (row.unitId) ids.push(row.unitId);
      const seeded = firstLessonByCourseId.get(row.courseId);
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

  const progressItems = progressRows.flatMap((row) => {
    const seeded = firstLessonByCourseId.get(row.courseId);
    const unitId = row.unitId || seeded?.unitId || '';
    const lessonId = row.lessonId || seeded?.lessonId || '';
    if (!unitId || !lessonId) return [];
    const lesson = lessonById.get(lessonId);
    if (!lesson || lesson.unitId !== unitId) return [];
    const videoUrl = lesson.videoUrl?.trim() ? resolveOssAssetUrl(lesson.videoUrl) : '';
    if (!videoUrl) return [];
    const certT = pickTranslationForDisplay(certTById.get(row.certificateId) ?? [], resolvedLocale);
    const courseT = pickTranslationForDisplay(courseTById.get(row.courseId) ?? [], resolvedLocale);
    const unitT = pickTranslationForDisplay(unitTById.get(unitId) ?? [], resolvedLocale);
    const lessonT = pickTranslationForDisplay(lessonTById.get(lessonId) ?? [], resolvedLocale);
    const certificateTitle = certT?.title?.trim() || '';
    const courseTitle = courseT?.title?.trim() || '';
    const unitTitle = unitT?.title?.trim() || '';
    const lessonTitle = lessonT?.title?.trim() || '';
    if (!certificateTitle || !courseTitle || !unitTitle || !lessonTitle) return [];
    return [{
      certificateCourseId: row.certificateCourseId,
      certificateSlug: row.certificateSlug,
      certificateTitle,
      courseSlug: row.courseSlug,
      courseTitle,
      unitTitle,
      lessonTitle,
      videoUrl,
      durationSeconds: lesson.durationSeconds,
      positionSeconds: Math.max(0, row.positionSeconds ?? 0),
      href: academyLearnPath(row.courseSlug, row.certificateCourseId),
      certificateHref: `/certificates/${row.certificateSlug}`,
    }];
  });

  let dashboard: AcademyHomeDashboard | null = null;

  // Dashboard mirrors the first Continue-learning record (updatedAt desc).
  const latest = progressRows[0];
  if (latest) {
    const certCourses = await db
      .select({
        id: academyCertificateCourses.id,
        courseId: academyCertificateCourses.courseId,
        sortOrder: academyCertificateCourses.sortOrder,
        courseStatus: academyCourses.status,
        courseSlug: academyCourses.slug,
      })
      .from(academyCertificateCourses)
      .innerJoin(academyCourses, eq(academyCourses.id, academyCertificateCourses.courseId))
      .where(eq(academyCertificateCourses.certificateId, latest.certificateId))
      .orderBy(academyCertificateCourses.sortOrder);

    const published = certCourses.filter((row) => row.courseStatus === 'published');
    const publishedCourseIds = published.map((row) => row.courseId);

    const certT = pickTranslationForDisplay(certTById.get(latest.certificateId) ?? [], resolvedLocale);
    const certificateTitle = certT?.title?.trim() || '';

    if (certificateTitle && published.length) {
      const lessonMap = await lessonIdsByCourseIds(publishedCourseIds);
      const allLessonIds = publishedCourseIds.flatMap((courseId) => lessonMap.get(courseId) ?? []);
      const completedSet = new Set<string>();
      if (allLessonIds.length) {
        const completed = await db
          .select({ lessonId: academyLessonCompletions.lessonId })
          .from(academyLessonCompletions)
          .where(
            and(
              eq(academyLessonCompletions.userId, userId),
              inArray(academyLessonCompletions.lessonId, allLessonIds),
            ),
          );
        for (const row of completed) completedSet.add(row.lessonId);
      }

      const courseIndex = published.findIndex((row) => row.id === latest.certificateCourseId) + 1;
      const courseT = pickTranslationForDisplay(courseTById.get(latest.courseId) ?? [], resolvedLocale);
      const courseTitle = courseT?.title?.trim() || '';
      const completedLessons = allLessonIds.filter((id) => completedSet.has(id)).length;
      const progressPercent = allLessonIds.length > 0
        ? Math.round((completedLessons / allLessonIds.length) * 100)
        : 0;

      if (courseIndex > 0 && courseTitle) {
        dashboard = {
          displayName: user ? displayName(user.firstName, user.lastName) : '',
          certificateSlug: latest.certificateSlug,
          certificateTitle,
          certificateHref: `/certificates/${latest.certificateSlug}`,
          courseSlug: latest.courseSlug,
          courseTitle,
          courseIndex,
          courseTotal: published.length,
          progressPercent,
          learnHref: academyLearnPath(latest.courseSlug, latest.certificateCourseId),
        };
      }
    }
  }

  const recentCertificates = certViewRows.map((row) => {
    const t = pickTranslationForDisplay(certTById.get(row.certificateId) ?? [], resolvedLocale);
    const skills = normalizeStringTags(t?.skills ?? []);
    return {
      slug: row.slug,
      href: `/certificates/${row.slug}`,
      title: t?.title?.trim() || row.slug,
      subtitle: t?.subtitle?.trim() || '',
      summary: t?.summary?.trim() || '',
      coverImage: resolveCover(row),
      skills,
      badgeLabel: t?.badgeLabel?.trim() || '',
    };
  });

  const recentCourses = courseViewRows.flatMap((row) => {
    const link = firstLinkByCourse.get(row.courseId);
    if (!link) return [];
    const t = pickTranslationForDisplay(courseTById.get(row.courseId) ?? [], resolvedLocale);
    const certT = pickTranslationForDisplay(certTById.get(link.certificateId) ?? [], resolvedLocale);
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
