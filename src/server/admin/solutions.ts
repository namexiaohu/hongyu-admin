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
import { pickTranslationForDisplay } from '@/lib/pick-translation-for-display';
import { normalizeSlug } from '@/lib/slug';
import { db } from '@/server/db';
import {
  categories,
  categoryTranslations,
  solutionContents,
  solutionTranslations,
  solutions,
} from '@/server/db/schema';
import { getDefaultSiteLanguageCode } from '@/server/admin/site-locale';

function toIso(value: Date) {
  return value.toISOString();
}

function mapListItem(
  row: typeof solutions.$inferSelect,
  title: string,
  localeCount: number,
  categoryName: string,
): AdminSolutionListItem {
  return {
    id: row.id,
    slug: row.slug,
    categoryId: row.categoryId,
    categoryName,
    sortOrder: row.sortOrder,
    status: row.status as SolutionStatus,
    coverImage: row.coverImage,
    title,
    localeCount,
    publishedAt: row.publishedAt ? toIso(row.publishedAt) : null,
    updatedAt: toIso(row.updatedAt),
  };
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

async function resolveCategoryNames(categoryIds: string[], locale: string) {
  if (!categoryIds.length) return new Map<string, string>();

  const rows = await db
    .select({
      categoryId: categoryTranslations.categoryId,
      locale: categoryTranslations.locale,
      name: categoryTranslations.name,
    })
    .from(categoryTranslations)
    .where(inArray(categoryTranslations.categoryId, categoryIds));

  const byCategory = new Map<string, Array<{ locale: string; name: string }>>();
  for (const row of rows) {
    const bucket = byCategory.get(row.categoryId) ?? [];
    bucket.push({ locale: row.locale, name: row.name });
    byCategory.set(row.categoryId, bucket);
  }

  const result = new Map<string, string>();
  for (const categoryId of categoryIds) {
    const translations = byCategory.get(categoryId) ?? [];
    const display = pickTranslationForDisplay(translations, locale);
    result.set(categoryId, display?.name?.trim() || categoryId);
  }
  return result;
}

async function mapDetail(
  row: typeof solutions.$inferSelect,
  translations: Array<typeof solutionTranslations.$inferSelect>,
  defaultLocale: string,
): Promise<AdminSolutionDetail> {
  const display = pickTranslationForDisplay(translations, defaultLocale);
  const blocks = await getBlocksForSolution(row.id);
  const categoryNames = await resolveCategoryNames([row.categoryId], defaultLocale);
  return {
    ...mapListItem(
      row,
      resolveSolutionDisplayTitle(display, row.slug),
      translations.length,
      categoryNames.get(row.categoryId) ?? '',
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
  categoryId?: string;
}) {
  const defaultLocale = await getDefaultSiteLanguageCode();
  const rows = await db
    .select()
    .from(solutions)
    .orderBy(asc(solutions.sortOrder), asc(solutions.slug));

  const solutionIds = rows.map((row) => row.id);
  const categoryIds = [...new Set(rows.map((row) => row.categoryId))];
  const [translations, categoryNames] = await Promise.all([
    solutionIds.length
      ? db.select().from(solutionTranslations).where(inArray(solutionTranslations.solutionId, solutionIds))
      : Promise.resolve([] as Array<typeof solutionTranslations.$inferSelect>),
    resolveCategoryNames(categoryIds, defaultLocale),
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
      categoryNames.get(row.categoryId) ?? '',
    );
  });

  if (params?.status) {
    items = items.filter((item) => item.status === params.status);
  }

  if (params?.categoryId) {
    items = items.filter((item) => item.categoryId === params.categoryId);
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
        || item.categoryName.toLowerCase().includes(keyword)
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

async function assertCategoryExists(categoryId: string) {
  const [row] = await db.select({ id: categories.id }).from(categories).where(eq(categories.id, categoryId)).limit(1);
  if (!row) throw new Error('CATEGORY_NOT_FOUND');
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

  if (parsed.categoryId !== undefined) {
    await assertCategoryExists(parsed.categoryId);
  }

  let nextPublishedAt = current.publishedAt;
  if (parsed.publishedAt !== undefined) {
    nextPublishedAt = parsed.publishedAt;
  } else if (parsed.status === 'published' && !current.publishedAt) {
    nextPublishedAt = new Date();
  }

  const [updated] = await db
    .update(solutions)
    .set({
      ...(parsed.slug !== undefined ? { slug: nextSlug } : {}),
      ...(parsed.categoryId !== undefined ? { categoryId: parsed.categoryId } : {}),
      ...(parsed.status !== undefined ? { status: parsed.status } : {}),
      ...(parsed.sortOrder !== undefined ? { sortOrder: parsed.sortOrder } : {}),
      ...(parsed.coverImage !== undefined ? { coverImage: parsed.coverImage } : {}),
      ...(parsed.materials !== undefined ? { materials: parsed.materials } : {}),
      ...(parsed.status !== undefined || parsed.publishedAt !== undefined ? { publishedAt: nextPublishedAt } : {}),
      updatedAt: new Date(),
    })
    .where(eq(solutions.id, id))
    .returning();

  if (!updated) return null;

  if (parsed.blocks !== undefined) {
    await upsertSolutionBlocks(id, parsed.blocks as SolutionBlockDraft[]);
  }

  return getAdminSolutionDetail(id);
}

async function upsertSolutionBlocks(solutionId: string, blocks: SolutionBlockDraft[]) {
  const [existing] = await db
    .select({ id: solutionContents.id })
    .from(solutionContents)
    .where(eq(solutionContents.solutionId, solutionId))
    .limit(1);

  if (existing) {
    await db
      .update(solutionContents)
      .set({ blocks: blocks as SolutionBlockDraft[], updatedAt: new Date() })
      .where(eq(solutionContents.solutionId, solutionId));
  } else {
    await db.insert(solutionContents).values({
      solutionId,
      blocks: blocks as SolutionBlockDraft[],
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

  await assertCategoryExists(parsed.categoryId);

  const [existingSlug] = await db.select({ id: solutions.id }).from(solutions).where(eq(solutions.slug, slug)).limit(1);
  if (existingSlug) throw new Error('SLUG_EXISTS');

  const [maxSort] = await db
    .select({ sortOrder: solutions.sortOrder })
    .from(solutions)
    .orderBy(desc(solutions.sortOrder))
    .limit(1);

  const [inserted] = await db
    .insert(solutions)
    .values({
      slug,
      categoryId: parsed.categoryId,
      sortOrder: (maxSort?.sortOrder ?? 0) + 10,
      status: parsed.status ?? 'draft',
      coverImage: parsed.coverImage ?? '',
      materials: parsed.materials ?? [],
      publishedAt: (parsed.status ?? 'draft') === 'published' ? new Date() : null,
    })
    .returning({ id: solutions.id });

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
