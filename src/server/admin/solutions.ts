import 'server-only';

import { and, asc, desc, eq, inArray } from 'drizzle-orm';

import type { SolutionBlockDraft } from '@/lib/solution-blocks';
import {
  type AdminSolutionDetail,
  type AdminSolutionListItem,
  type AdminSolutionTranslation,
  adminSolutionCreateSchema,
  adminSolutionPatchSchema,
  adminSolutionTranslationPatchSchema,
  adminSolutionTranslationSchema,
  reservedSolutionSlugs,
  resolveSolutionDisplayTitle,
  type SolutionMaterial,
  type SolutionStatus,
} from '@/lib/solution-content';
import {
  normalizeBackgroundWrite,
  resolveAdminBackgroundPreview,
} from '@/lib/partner-center-background-presets';
import { resolveOssAssetUrl, toOssStorageKey } from '@/lib/oss-asset-url';
import { pickTranslationForDisplay } from '@/lib/pick-translation-for-display';
import { normalizeSlug } from '@/lib/slug';
import { getAdminMediaAssetStorageKeys } from '@/server/admin/media-assets';
import { db } from '@/server/db';
import {
  productCoverageBoards,
  solutionBoardLinks,
  solutionContents,
  solutionTranslations,
  solutions,
} from '@/server/db/schema';
import { getDefaultSiteLanguageCode } from '@/server/admin/site-locale';

function normalizeMaterials(materials: SolutionMaterial[] | undefined): SolutionMaterial[] {
  if (!materials?.length) return [];
  return materials
    .map((item) => ({
      name: item.name.trim(),
      url: toOssStorageKey(item.url),
      mimeType: item.mimeType?.trim() || 'application/octet-stream',
    }))
    .filter((item) => item.url);
}

function normalizeGallery(gallery: Array<{ url: string; alt?: string; width?: number | null; height?: number | null }> | undefined) {
  if (!gallery?.length) return [];
  return gallery
    .map((item) => ({
      url: toOssStorageKey(item.url.trim()),
      alt: item.alt?.trim() ?? '',
      width: item.width ?? null,
      height: item.height ?? null,
    }))
    .filter((item) => item.url);
}

function normalizeVideoUrl(value: string | undefined): string {
  const trimmed = value?.trim() ?? '';
  return trimmed ? toOssStorageKey(trimmed) : '';
}

function toIso(value: Date) {
  return value.toISOString();
}

function mapListItem(
  row: typeof solutions.$inferSelect,
  title: string,
  localeCount: number,
  boardKeys: string[],
  uploadKeyById: Map<string, string>,
): AdminSolutionListItem {
  const bg = resolveAdminBackgroundPreview({
    mode: row.backgroundMode ?? '',
    value: row.backgroundValue ?? '',
    legacyBackgroundImageKey: row.backgroundImage ?? '',
    uploadKeyById,
    toPublicUrl: resolveOssAssetUrl,
  });

  return {
    id: row.id,
    slug: row.slug,
    boardKeys,
    sortOrder: row.sortOrder,
    status: row.status as SolutionStatus,
    coverImage: row.coverImage,
    gallery: (row.gallery ?? []) as AdminSolutionListItem['gallery'],
    videoUrl: row.videoUrl ?? '',
    backgroundMode: bg.mode,
    backgroundValue: bg.value,
    backgroundImage: row.backgroundImage ?? '',
    backgroundPreviewUrl: bg.previewUrl,
    showCoverOnBackground: Boolean(row.showCoverOnBackground),
    title,
    localeCount,
    publishedAt: row.publishedAt ? toIso(row.publishedAt) : null,
    updatedAt: toIso(row.updatedAt),
  };
}

async function loadUploadKeysForRows(rows: Array<typeof solutions.$inferSelect>) {
  const ids = rows
    .filter((row) => row.backgroundMode === 'upload' && row.backgroundValue)
    .map((row) => row.backgroundValue);
  return getAdminMediaAssetStorageKeys(ids);
}

async function getBoardKeysForSolutions(solutionIds: string[]): Promise<Map<string, string[]>> {
  if (!solutionIds.length) return new Map();
  const links = await db
    .select({
      solutionId: solutionBoardLinks.solutionId,
      boardKey: productCoverageBoards.boardKey,
    })
    .from(solutionBoardLinks)
    .innerJoin(productCoverageBoards, eq(productCoverageBoards.id, solutionBoardLinks.boardId))
    .where(inArray(solutionBoardLinks.solutionId, solutionIds));

  const result = new Map<string, string[]>();
  for (const link of links) {
    const bucket = result.get(link.solutionId) ?? [];
    bucket.push(link.boardKey);
    result.set(link.solutionId, bucket);
  }
  return result;
}

async function syncSolutionBoardLinks(solutionId: string, boardKeys: string[]) {
  const boardRows = boardKeys.length
    ? await db
        .select({ id: productCoverageBoards.id, boardKey: productCoverageBoards.boardKey })
        .from(productCoverageBoards)
        .where(inArray(productCoverageBoards.boardKey, boardKeys))
    : [];

  await db.delete(solutionBoardLinks).where(eq(solutionBoardLinks.solutionId, solutionId));

  if (boardRows.length) {
    await db.insert(solutionBoardLinks).values(
      boardRows.map((board) => ({ solutionId, boardId: board.id })),
    );
  }
}

function mapTranslation(row: typeof solutionTranslations.$inferSelect): AdminSolutionTranslation {
  return {
    id: row.id,
    solutionId: row.solutionId,
    locale: row.locale,
    title: row.title,
    largeTitle: row.largeTitle,
    description: row.description,
    badgeText: row.badgeText,
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
    stats: (row.stats ?? []) as AdminSolutionTranslation['stats'],
    productParams: (row.productParams ?? []) as AdminSolutionTranslation['productParams'],
    tags: (row.tags ?? []) as string[],
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

async function getBlocksForSolution(solutionId: string): Promise<SolutionBlockDraft[]> {
  const [content] = await db
    .select()
    .from(solutionContents)
    .where(eq(solutionContents.solutionId, solutionId))
    .limit(1);
  return (content?.blocks ?? []) as SolutionBlockDraft[];
}

async function mapDetail(
  row: typeof solutions.$inferSelect,
  translations: Array<typeof solutionTranslations.$inferSelect>,
  defaultLocale: string,
): Promise<AdminSolutionDetail> {
  const display = pickTranslationForDisplay(translations, defaultLocale);
  const blocks = await getBlocksForSolution(row.id);
  const boardKeyMap = await getBoardKeysForSolutions([row.id]);
  const uploadKeys = await loadUploadKeysForRows([row]);
  return {
    ...mapListItem(
      row,
      resolveSolutionDisplayTitle(display, row.slug),
      translations.length,
      boardKeyMap.get(row.id) ?? [],
      uploadKeys,
    ),
    materials: (row.materials ?? []) as SolutionMaterial[],
    blocks,
    translations: translations.map(mapTranslation),
  };
}

export async function getAdminSolutionList(params?: {
  keyword?: string;
  status?: SolutionStatus;
  locale?: string;
}) {
  const defaultLocale = await getDefaultSiteLanguageCode();
  const rows = await db
    .select()
    .from(solutions)
    .orderBy(asc(solutions.sortOrder), asc(solutions.slug));

  const solutionIds = rows.map((row) => row.id);
  const [translations, boardKeyMap, uploadKeys] = await Promise.all([
    solutionIds.length
      ? db.select().from(solutionTranslations).where(inArray(solutionTranslations.solutionId, solutionIds))
      : Promise.resolve([] as Array<typeof solutionTranslations.$inferSelect>),
    getBoardKeysForSolutions(solutionIds),
    loadUploadKeysForRows(rows),
  ]);

  const translationsBySolution = new Map<string, typeof solutionTranslations.$inferSelect[]>();
  for (const translation of translations) {
    const bucket = translationsBySolution.get(translation.solutionId) ?? [];
    bucket.push(translation);
    translationsBySolution.set(translation.solutionId, bucket);
  }

  let items = rows.map((row) => {
    const rowTranslations = translationsBySolution.get(row.id) ?? [];
    const display = pickTranslationForDisplay(rowTranslations, defaultLocale);
    return mapListItem(
      row,
      resolveSolutionDisplayTitle(display, row.slug),
      rowTranslations.length,
      boardKeyMap.get(row.id) ?? [],
      uploadKeys,
    );
  });

  if (params?.status) {
    items = items.filter((item) => item.status === params.status);
  }

  if (params?.locale) {
    const locale = params.locale.trim().toLowerCase();
    items = items.filter((item) => {
      const rowTranslations = translationsBySolution.get(item.id) ?? [];
      return rowTranslations.some((translation) => translation.locale.toLowerCase() === locale);
    });
  }

  if (params?.keyword?.trim()) {
    const keyword = params.keyword.trim().toLowerCase();
    items = items.filter((item) => {
      const rowTranslations = translationsBySolution.get(item.id) ?? [];
      return (
        item.slug.includes(keyword)
        || item.title.toLowerCase().includes(keyword)
        || rowTranslations.some((translation) => translation.title.toLowerCase().includes(keyword))
      );
    });
  }

  return { items, total: items.length };
}

export async function getAdminSolutionDetail(id: string): Promise<AdminSolutionDetail | null> {
  const [row] = await db.select().from(solutions).where(eq(solutions.id, id)).limit(1);
  if (!row) return null;

  const translations = await db
    .select()
    .from(solutionTranslations)
    .where(eq(solutionTranslations.solutionId, id))
    .orderBy(asc(solutionTranslations.locale));

  const defaultLocale = await getDefaultSiteLanguageCode();
  return mapDetail(row, translations, defaultLocale);
}

export async function getAdminSolutionTranslation(translationId: string) {
  const [row] = await db
    .select()
    .from(solutionTranslations)
    .where(eq(solutionTranslations.id, translationId))
    .limit(1);
  return row ? mapTranslation(row) : null;
}

export async function updateAdminSolution(id: string, input: unknown) {
  const parsed = adminSolutionPatchSchema.parse(input);

  const [current] = await db.select().from(solutions).where(eq(solutions.id, id)).limit(1);
  if (!current) return null;

  let nextSlug = current.slug;

  if (parsed.slug !== undefined) {
    const slug = normalizeSlug(parsed.slug);
    if (!slug) throw new Error('SLUG_INVALID');
    if (reservedSolutionSlugs.includes(slug as (typeof reservedSolutionSlugs)[number])) {
      throw new Error('SLUG_RESERVED');
    }

    if (slug !== current.slug) {
      const [existingSlug] = await db
        .select({ id: solutions.id })
        .from(solutions)
        .where(eq(solutions.slug, slug))
        .limit(1);
      if (existingSlug) throw new Error('SLUG_EXISTS');

      nextSlug = slug;
    }
  }

  let nextPublishedAt = current.publishedAt;
  if (parsed.publishedAt !== undefined) {
    nextPublishedAt = parsed.publishedAt;
  } else if (parsed.status === 'published' && !current.publishedAt) {
    nextPublishedAt = new Date();
  }

  const bgPatch: {
    backgroundMode?: string;
    backgroundValue?: string;
    backgroundImage?: string;
  } = {};
  if (parsed.backgroundMode !== undefined || parsed.backgroundValue !== undefined) {
    const bg = normalizeBackgroundWrite(
      parsed.backgroundMode ?? current.backgroundMode,
      parsed.backgroundValue ?? current.backgroundValue,
    );
    bgPatch.backgroundMode = bg.backgroundMode;
    bgPatch.backgroundValue = bg.backgroundValue;
    if (bg.backgroundMode === 'upload' && bg.backgroundValue) {
      const keys = await getAdminMediaAssetStorageKeys([bg.backgroundValue]);
      bgPatch.backgroundImage = keys.get(bg.backgroundValue) ?? '';
    } else {
      bgPatch.backgroundImage = '';
    }
  }

  const [updated] = await db
    .update(solutions)
    .set({
      ...(parsed.slug !== undefined ? { slug: nextSlug } : {}),
      ...(parsed.status !== undefined ? { status: parsed.status } : {}),
      ...(parsed.sortOrder !== undefined ? { sortOrder: parsed.sortOrder } : {}),
      ...(parsed.coverImage !== undefined ? { coverImage: toOssStorageKey(parsed.coverImage) } : {}),
      ...(parsed.gallery !== undefined ? { gallery: normalizeGallery(parsed.gallery) } : {}),
      ...(parsed.videoUrl !== undefined ? { videoUrl: normalizeVideoUrl(parsed.videoUrl) } : {}),
      ...bgPatch,
      ...(parsed.showCoverOnBackground !== undefined
        ? { showCoverOnBackground: parsed.showCoverOnBackground }
        : {}),
      ...(parsed.materials !== undefined ? { materials: normalizeMaterials(parsed.materials) } : {}),
      ...(parsed.status !== undefined || parsed.publishedAt !== undefined ? { publishedAt: nextPublishedAt } : {}),
      updatedAt: new Date(),
    })
    .where(eq(solutions.id, id))
    .returning();

  if (!updated) return null;

  if (parsed.boardKeys !== undefined) {
    await syncSolutionBoardLinks(id, parsed.boardKeys);
  }

  if (parsed.blocks !== undefined) {
    await upsertSolutionBlocks(id, parsed.blocks as SolutionBlockDraft[]);
  }

  return getAdminSolutionDetail(id);
}

async function upsertSolutionBlocks(solutionId: string, blocks: SolutionBlockDraft[]) {
  const normalized = blocks.map((block) => ({
    ...block,
    videoUrl: block.videoUrl?.trim() ? toOssStorageKey(block.videoUrl) : block.videoUrl ?? '',
    carouselImages: (block.carouselImages ?? []).map((slide) => ({
      ...slide,
      url: slide.url.trim() ? toOssStorageKey(slide.url) : slide.url,
    })),
    items: (block.items ?? []).map((item) => ({
      ...item,
      coverImage: item.coverImage?.trim() ? toOssStorageKey(item.coverImage) : item.coverImage,
    })),
  }));

  const [existing] = await db
    .select({ id: solutionContents.id })
    .from(solutionContents)
    .where(eq(solutionContents.solutionId, solutionId))
    .limit(1);

  if (existing) {
    await db
      .update(solutionContents)
      .set({ blocks: normalized as SolutionBlockDraft[], updatedAt: new Date() })
      .where(eq(solutionContents.solutionId, solutionId));
  } else {
    await db.insert(solutionContents).values({
      solutionId,
      blocks: normalized as SolutionBlockDraft[],
    });
  }
}

export async function updateAdminSolutionTranslation(translationId: string, input: unknown) {
  const parsed = adminSolutionTranslationPatchSchema.parse(input);
  const [updated] = await db
    .update(solutionTranslations)
    .set({
      ...(parsed.locale !== undefined ? { locale: parsed.locale } : {}),
      ...(parsed.title !== undefined ? { title: parsed.title } : {}),
      ...(parsed.largeTitle !== undefined ? { largeTitle: parsed.largeTitle } : {}),
      ...(parsed.description !== undefined ? { description: parsed.description } : {}),
      ...(parsed.badgeText !== undefined ? { badgeText: parsed.badgeText } : {}),
      ...(parsed.seoTitle !== undefined ? { seoTitle: parsed.seoTitle } : {}),
      ...(parsed.seoDescription !== undefined ? { seoDescription: parsed.seoDescription } : {}),
      ...(parsed.stats !== undefined ? { stats: parsed.stats } : {}),
      ...(parsed.productParams !== undefined ? { productParams: parsed.productParams } : {}),
      ...(parsed.tags !== undefined ? { tags: parsed.tags } : {}),
      updatedAt: new Date(),
    })
    .where(eq(solutionTranslations.id, translationId))
    .returning();

  return updated ? mapTranslation(updated) : null;
}

export async function upsertAdminSolutionTranslation(solutionId: string, input: unknown) {
  const parsed = adminSolutionTranslationSchema.parse(input);
  const [solution] = await db.select({ id: solutions.id }).from(solutions).where(eq(solutions.id, solutionId)).limit(1);
  if (!solution) return null;

  const [existing] = await db
    .select()
    .from(solutionTranslations)
    .where(and(eq(solutionTranslations.solutionId, solutionId), eq(solutionTranslations.locale, parsed.locale)))
    .limit(1);

  if (existing) {
    return updateAdminSolutionTranslation(existing.id, parsed);
  }

  const [inserted] = await db
    .insert(solutionTranslations)
    .values({
      solutionId,
      locale: parsed.locale,
      title: parsed.title,
      largeTitle: parsed.largeTitle ?? '',
      description: parsed.description ?? '',
      badgeText: parsed.badgeText ?? '',
      seoTitle: parsed.seoTitle ?? '',
      seoDescription: parsed.seoDescription ?? '',
      stats: parsed.stats ?? [],
      productParams: parsed.productParams ?? [],
      tags: parsed.tags ?? [],
    })
    .returning();

  return mapTranslation(inserted);
}

export async function createAdminSolution(input: unknown) {
  const parsed = adminSolutionCreateSchema.parse(input);
  const slug = normalizeSlug(parsed.slug);
  if (!slug) throw new Error('SLUG_INVALID');
  if (reservedSolutionSlugs.includes(slug as (typeof reservedSolutionSlugs)[number])) {
    throw new Error('SLUG_RESERVED');
  }

  const [existingSlug] = await db.select({ id: solutions.id }).from(solutions).where(eq(solutions.slug, slug)).limit(1);
  if (existingSlug) throw new Error('SLUG_EXISTS');

  const [maxSort] = await db
    .select({ sortOrder: solutions.sortOrder })
    .from(solutions)
    .orderBy(desc(solutions.sortOrder))
    .limit(1);

  const bg = normalizeBackgroundWrite(parsed.backgroundMode, parsed.backgroundValue);
  let backgroundImage = bg.backgroundImage;
  if (bg.backgroundMode === 'upload' && bg.backgroundValue) {
    const keys = await getAdminMediaAssetStorageKeys([bg.backgroundValue]);
    backgroundImage = keys.get(bg.backgroundValue) ?? '';
  }

  const [inserted] = await db
    .insert(solutions)
    .values({
      slug,
      categoryId: null,
      sortOrder: (maxSort?.sortOrder ?? 0) + 10,
      status: parsed.status ?? 'draft',
      coverImage: toOssStorageKey(parsed.coverImage ?? ''),
      gallery: normalizeGallery(parsed.gallery),
      videoUrl: normalizeVideoUrl(parsed.videoUrl),
      backgroundMode: bg.backgroundMode,
      backgroundValue: bg.backgroundValue,
      backgroundImage,
      showCoverOnBackground: parsed.showCoverOnBackground ?? true,
      materials: normalizeMaterials(parsed.materials),
      publishedAt: (parsed.status ?? 'draft') === 'published' ? new Date() : null,
    })
    .returning({ id: solutions.id });

  if (parsed.boardKeys?.length) {
    await syncSolutionBoardLinks(inserted.id, parsed.boardKeys);
  }

  await upsertAdminSolutionTranslation(inserted.id, parsed.translation);

  if (parsed.blocks?.length) {
    await upsertSolutionBlocks(inserted.id, parsed.blocks as SolutionBlockDraft[]);
  } else {
    await db.insert(solutionContents).values({ solutionId: inserted.id, blocks: [] });
  }

  return getAdminSolutionDetail(inserted.id);
}

export async function deleteAdminSolution(id: string) {
  const [deleted] = await db.delete(solutions).where(eq(solutions.id, id)).returning({ id: solutions.id });
  return Boolean(deleted);
}
