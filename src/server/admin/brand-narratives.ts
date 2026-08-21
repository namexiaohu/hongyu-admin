import 'server-only';

import { and, asc, desc, eq, inArray } from 'drizzle-orm';

import type { BrandNarrativeBlockDraft } from '@/lib/brand-narrative-blocks';
import {
  type AdminBrandNarrativeDetail,
  type AdminBrandNarrativeListItem,
  type AdminBrandNarrativeTranslation,
  adminBrandNarrativeCreateSchema,
  adminBrandNarrativePatchSchema,
  adminBrandNarrativeTranslationPatchSchema,
  adminBrandNarrativeTranslationSchema,
  reservedBrandNarrativeSlugs,
  resolveBrandNarrativeDisplayTitle,
  type BrandNarrativeStatus,
} from '@/lib/brand-narrative-content';
import {
  normalizeBackgroundWrite,
  resolveAdminBackgroundPreview,
} from '@/lib/partner-center-background-presets';
import { resolveOssAssetUrl } from '@/lib/oss-asset-url';
import { pickTranslationForDisplay } from '@/lib/pick-translation-for-display';
import { normalizeSlug } from '@/lib/slug';
import { getAdminMediaAssetStorageKeys } from '@/server/admin/media-assets';
import { db } from '@/server/db';
import { brandNarrativeContents, brandNarrativeTranslations, brandNarratives } from '@/server/db/schema';
import { getDefaultSiteLanguageCode } from '@/server/admin/site-locale';

function toIso(value: Date) {
  return value.toISOString();
}

function mapListItem(
  row: typeof brandNarratives.$inferSelect,
  title: string,
  localeCount: number,
  uploadKeyById: Map<string, string>,
): AdminBrandNarrativeListItem {
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
    sortOrder: row.sortOrder,
    status: row.status as BrandNarrativeStatus,
    coverImage: row.coverImage,
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

async function loadUploadKeysForRows(rows: Array<typeof brandNarratives.$inferSelect>) {
  const ids = rows
    .filter((row) => row.backgroundMode === 'upload' && row.backgroundValue)
    .map((row) => row.backgroundValue);
  return getAdminMediaAssetStorageKeys(ids);
}

function mapTranslation(row: typeof brandNarrativeTranslations.$inferSelect): AdminBrandNarrativeTranslation {
  return {
    id: row.id,
    narrativeId: row.narrativeId,
    locale: row.locale,
    title: row.title,
    largeTitle: row.largeTitle,
    description: row.description,
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
    stats: (row.stats ?? []) as AdminBrandNarrativeTranslation['stats'],
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

async function getBlocksForNarrative(narrativeId: string): Promise<BrandNarrativeBlockDraft[]> {
  const [content] = await db
    .select()
    .from(brandNarrativeContents)
    .where(eq(brandNarrativeContents.narrativeId, narrativeId))
    .limit(1);
  return (content?.blocks ?? []) as BrandNarrativeBlockDraft[];
}

async function mapDetail(
  row: typeof brandNarratives.$inferSelect,
  translations: Array<typeof brandNarrativeTranslations.$inferSelect>,
  defaultLocale: string,
): Promise<AdminBrandNarrativeDetail> {
  const display = pickTranslationForDisplay(translations, defaultLocale);
  const blocks = await getBlocksForNarrative(row.id);
  const uploadKeys = await loadUploadKeysForRows([row]);
  return {
    ...mapListItem(row, resolveBrandNarrativeDisplayTitle(display, row.slug), translations.length, uploadKeys),
    blocks,
    translations: translations.map(mapTranslation),
  };
}

export async function getAdminBrandNarrativeList(params?: {
  keyword?: string;
  status?: BrandNarrativeStatus;
  locale?: string;
}) {
  const defaultLocale = await getDefaultSiteLanguageCode();
  const rows = await db
    .select()
    .from(brandNarratives)
    .orderBy(asc(brandNarratives.sortOrder), asc(brandNarratives.slug));

  const narrativeIds = rows.map((row) => row.id);
  const translations = narrativeIds.length
    ? await db.select().from(brandNarrativeTranslations).where(inArray(brandNarrativeTranslations.narrativeId, narrativeIds))
    : [];
  const uploadKeys = await loadUploadKeysForRows(rows);

  const translationsByNarrative = new Map<string, typeof brandNarrativeTranslations.$inferSelect[]>();
  for (const translation of translations) {
    const bucket = translationsByNarrative.get(translation.narrativeId) ?? [];
    bucket.push(translation);
    translationsByNarrative.set(translation.narrativeId, bucket);
  }

  let items = rows.map((row) => {
    const rowTranslations = translationsByNarrative.get(row.id) ?? [];
    const display = pickTranslationForDisplay(rowTranslations, defaultLocale);
    return mapListItem(row, resolveBrandNarrativeDisplayTitle(display, row.slug), rowTranslations.length, uploadKeys);
  });

  if (params?.status) {
    items = items.filter((item) => item.status === params.status);
  }

  if (params?.locale) {
    const locale = params.locale.trim().toLowerCase();
    items = items.filter((item) => {
      const rowTranslations = translationsByNarrative.get(item.id) ?? [];
      return rowTranslations.some((translation) => translation.locale.toLowerCase() === locale);
    });
  }

  if (params?.keyword?.trim()) {
    const keyword = params.keyword.trim().toLowerCase();
    items = items.filter((item) => {
      const rowTranslations = translationsByNarrative.get(item.id) ?? [];
      return (
        item.slug.includes(keyword)
        || item.title.toLowerCase().includes(keyword)
        || rowTranslations.some((translation) => translation.title.toLowerCase().includes(keyword))
      );
    });
  }

  return { items, total: items.length };
}

export async function getAdminBrandNarrativeDetail(id: string): Promise<AdminBrandNarrativeDetail | null> {
  const [row] = await db.select().from(brandNarratives).where(eq(brandNarratives.id, id)).limit(1);
  if (!row) return null;

  const translations = await db
    .select()
    .from(brandNarrativeTranslations)
    .where(eq(brandNarrativeTranslations.narrativeId, id))
    .orderBy(asc(brandNarrativeTranslations.locale));

  const defaultLocale = await getDefaultSiteLanguageCode();
  return mapDetail(row, translations, defaultLocale);
}

export async function getAdminBrandNarrativeTranslation(translationId: string) {
  const [row] = await db
    .select()
    .from(brandNarrativeTranslations)
    .where(eq(brandNarrativeTranslations.id, translationId))
    .limit(1);
  return row ? mapTranslation(row) : null;
}

export async function updateAdminBrandNarrative(id: string, input: unknown) {
  const parsed = adminBrandNarrativePatchSchema.parse(input);

  const [current] = await db.select().from(brandNarratives).where(eq(brandNarratives.id, id)).limit(1);
  if (!current) return null;

  let nextSlug = current.slug;

  if (parsed.slug !== undefined) {
    const slug = normalizeSlug(parsed.slug);
    if (!slug) throw new Error('SLUG_INVALID');
    if (reservedBrandNarrativeSlugs.includes(slug as (typeof reservedBrandNarrativeSlugs)[number])) {
      throw new Error('SLUG_RESERVED');
    }

    if (slug !== current.slug) {
      const [existingSlug] = await db
        .select({ id: brandNarratives.id })
        .from(brandNarratives)
        .where(eq(brandNarratives.slug, slug))
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
    .update(brandNarratives)
    .set({
      ...(parsed.slug !== undefined ? { slug: nextSlug } : {}),
      ...(parsed.status !== undefined ? { status: parsed.status } : {}),
      ...(parsed.sortOrder !== undefined ? { sortOrder: parsed.sortOrder } : {}),
      ...(parsed.coverImage !== undefined ? { coverImage: parsed.coverImage } : {}),
      ...bgPatch,
      ...(parsed.showCoverOnBackground !== undefined
        ? { showCoverOnBackground: parsed.showCoverOnBackground }
        : {}),
      ...(parsed.status !== undefined || parsed.publishedAt !== undefined ? { publishedAt: nextPublishedAt } : {}),
      updatedAt: new Date(),
    })
    .where(eq(brandNarratives.id, id))
    .returning();

  if (!updated) return null;

  if (parsed.blocks !== undefined) {
    await upsertNarrativeBlocks(id, parsed.blocks as BrandNarrativeBlockDraft[]);
  }

  return getAdminBrandNarrativeDetail(id);
}

async function upsertNarrativeBlocks(narrativeId: string, blocks: BrandNarrativeBlockDraft[]) {
  const [existing] = await db
    .select({ id: brandNarrativeContents.id })
    .from(brandNarrativeContents)
    .where(eq(brandNarrativeContents.narrativeId, narrativeId))
    .limit(1);

  if (existing) {
    await db
      .update(brandNarrativeContents)
      .set({ blocks: blocks as BrandNarrativeBlockDraft[], updatedAt: new Date() })
      .where(eq(brandNarrativeContents.narrativeId, narrativeId));
  } else {
    await db.insert(brandNarrativeContents).values({
      narrativeId,
      blocks: blocks as BrandNarrativeBlockDraft[],
    });
  }
}

export async function updateAdminBrandNarrativeTranslation(translationId: string, input: unknown) {
  const parsed = adminBrandNarrativeTranslationPatchSchema.parse(input);
  const [updated] = await db
    .update(brandNarrativeTranslations)
    .set({
      ...(parsed.locale !== undefined ? { locale: parsed.locale } : {}),
      ...(parsed.title !== undefined ? { title: parsed.title } : {}),
      ...(parsed.largeTitle !== undefined ? { largeTitle: parsed.largeTitle } : {}),
      ...(parsed.description !== undefined ? { description: parsed.description } : {}),
      ...(parsed.seoTitle !== undefined ? { seoTitle: parsed.seoTitle } : {}),
      ...(parsed.seoDescription !== undefined ? { seoDescription: parsed.seoDescription } : {}),
      ...(parsed.stats !== undefined ? { stats: parsed.stats } : {}),
      updatedAt: new Date(),
    })
    .where(eq(brandNarrativeTranslations.id, translationId))
    .returning();

  return updated ? mapTranslation(updated) : null;
}

export async function upsertAdminBrandNarrativeTranslation(narrativeId: string, input: unknown) {
  const parsed = adminBrandNarrativeTranslationSchema.parse(input);
  const [narrative] = await db.select({ id: brandNarratives.id }).from(brandNarratives).where(eq(brandNarratives.id, narrativeId)).limit(1);
  if (!narrative) return null;

  const [existing] = await db
    .select()
    .from(brandNarrativeTranslations)
    .where(and(eq(brandNarrativeTranslations.narrativeId, narrativeId), eq(brandNarrativeTranslations.locale, parsed.locale)))
    .limit(1);

  if (existing) {
    return updateAdminBrandNarrativeTranslation(existing.id, parsed);
  }

  const [inserted] = await db
    .insert(brandNarrativeTranslations)
    .values({
      narrativeId,
      locale: parsed.locale,
      title: parsed.title,
      largeTitle: parsed.largeTitle ?? '',
      description: parsed.description ?? '',
      seoTitle: parsed.seoTitle ?? '',
      seoDescription: parsed.seoDescription ?? '',
      stats: parsed.stats ?? [],
    })
    .returning();

  return mapTranslation(inserted);
}

export async function createAdminBrandNarrative(input: unknown) {
  const parsed = adminBrandNarrativeCreateSchema.parse(input);
  const slug = normalizeSlug(parsed.slug);
  if (!slug) throw new Error('SLUG_INVALID');
  if (reservedBrandNarrativeSlugs.includes(slug as (typeof reservedBrandNarrativeSlugs)[number])) {
    throw new Error('SLUG_RESERVED');
  }

  const [existingSlug] = await db.select({ id: brandNarratives.id }).from(brandNarratives).where(eq(brandNarratives.slug, slug)).limit(1);
  if (existingSlug) throw new Error('SLUG_EXISTS');

  const [maxSort] = await db
    .select({ sortOrder: brandNarratives.sortOrder })
    .from(brandNarratives)
    .orderBy(desc(brandNarratives.sortOrder))
    .limit(1);

  const bg = normalizeBackgroundWrite(parsed.backgroundMode, parsed.backgroundValue);
  let backgroundImage = bg.backgroundImage;
  if (bg.backgroundMode === 'upload' && bg.backgroundValue) {
    const keys = await getAdminMediaAssetStorageKeys([bg.backgroundValue]);
    backgroundImage = keys.get(bg.backgroundValue) ?? '';
  }

  const [inserted] = await db
    .insert(brandNarratives)
    .values({
      slug,
      sortOrder: (maxSort?.sortOrder ?? 0) + 10,
      status: parsed.status ?? 'draft',
      coverImage: parsed.coverImage ?? '',
      backgroundMode: bg.backgroundMode,
      backgroundValue: bg.backgroundValue,
      backgroundImage,
      showCoverOnBackground: parsed.showCoverOnBackground ?? true,
      publishedAt: (parsed.status ?? 'draft') === 'published' ? new Date() : null,
    })
    .returning({ id: brandNarratives.id });

  await upsertAdminBrandNarrativeTranslation(inserted.id, parsed.translation);

  if (parsed.blocks?.length) {
    await upsertNarrativeBlocks(inserted.id, parsed.blocks as BrandNarrativeBlockDraft[]);
  } else {
    await db.insert(brandNarrativeContents).values({ narrativeId: inserted.id, blocks: [] });
  }

  return getAdminBrandNarrativeDetail(inserted.id);
}

export async function deleteAdminBrandNarrative(id: string) {
  const [deleted] = await db.delete(brandNarratives).where(eq(brandNarratives.id, id)).returning({ id: brandNarratives.id });
  return Boolean(deleted);
}
