import 'server-only';

import { and, asc, eq, inArray, ne, sql } from 'drizzle-orm';

import type { SolutionBlockDraft, SolutionBlockLocaleCopy } from '@/lib/solution-blocks';
import { isSummaryIcon, pickBlockLocaleCopy, summaryItemUsesCoverImage } from '@/lib/solution-blocks';
import { resolveOssAssetUrl } from '@/lib/oss-asset-url';
import { resolveStorefrontCoverUrl } from '@/lib/cover-presets';
import {
  resolvePartnerCenterBackgroundDisplay,
} from '@/lib/partner-center-background-presets';
import { pickTranslationForDisplay } from '@/lib/pick-translation-for-display';
import type { SolutionMaterial, SolutionProductParam, SolutionStat } from '@/lib/solution-content';
import { db } from '@/server/db';
import {
  productCoverageBoards,
  productCoverageBoardTranslations,
  products,
  solutionBoardLinks,
  solutionContents,
  solutionTranslations,
  solutions,
} from '@/server/db/schema';
import { getDefaultSiteLanguageCode } from '@/server/admin/site-locale';
import { getAdminMediaAssetStorageKeys } from '@/server/admin/media-assets';
import { collectCoverUploadIds, collectCoverUploadIdsFromBlocks } from '@/server/admin/cover-images';
import {
  coverImageFromProductFields,
  loadProductTranslationsByProductIds,
  pickProductTranslation,
} from '@/server/products/load-product-translations';

export type StorefrontSolutionMaterial = {
  name: string;
  url: string;
  mimeType: string;
};

export type StorefrontSolutionListItem = {
  slug: string;
  href: string;
  coverImage: string;
  badgeText: string;
  categorySlug: string;
  categoryLabel: string;
  title: string;
  largeTitle: string;
  description: string;
  tags: string[];
};

export type StorefrontSolutionSection = Record<string, unknown>;

export type StorefrontSolutionDetail = {
  slug: string;
  locale: string;
  seo: { title: string; description: string };
  breadcrumbs: Array<{ label: string; href?: string }>;
  hero: {
    eyebrow: string;
    title: string;
    lead: string;
    image: string;
    imageAlt: string;
    backgroundImage: string;
    backgroundSolidCss: string;
    showCoverOnBackground: boolean;
    videoUrl: string;
    gallery: Array<{ url: string; alt: string }>;
  };
  stats: Array<{ value: string; label: string; suffix?: string }> | null;
  materials: StorefrontSolutionMaterial[];
  productParams: SolutionProductParam[];
  sections: StorefrontSolutionSection[];
  related: StorefrontSolutionListItem[];
};

export type StorefrontSolutionListResponse = {
  locale: string;
  category: string | null;
  page: number;
  pageSize: number;
  total: number;
  items: StorefrontSolutionListItem[];
};

export type StorefrontSolutionCategoryTab = {
  id: string;
  slug: string | null;
  label: string;
  count: number;
};

function text(value: string | undefined, fallback = '') {
  return value?.trim() || fallback;
}

function pickLocaleCopy(
  locales: Record<string, SolutionBlockLocaleCopy> | undefined,
  locale: string,
): SolutionBlockLocaleCopy {
  return pickBlockLocaleCopy(locales, locale);
}

function pickLocaleRow<T extends { locale: string }>(rows: T[], locale: string): T | null {
  if (!rows.length) return null;
  const normalized = locale.trim().toLowerCase();
  const exact = rows.find((row) => row.locale.toLowerCase() === normalized);
  if (exact) return exact;
  const prefix = normalized.split('-')[0];
  const prefixMatch = rows.find((row) => {
    const rowLocale = row.locale.toLowerCase();
    return rowLocale === prefix || rowLocale.startsWith(`${prefix}-`);
  });
  if (prefixMatch) return prefixMatch;
  const english = rows.find((row) => row.locale.toLowerCase().startsWith('en'));
  return english ?? rows[0] ?? null;
}

function mapMaterials(raw: SolutionMaterial[] | null | undefined): StorefrontSolutionMaterial[] {
  return (raw ?? [])
    .filter((item) => item.url?.trim())
    .map((item) => ({
      name: text(item.name, item.url),
      url: resolveOssAssetUrl(item.url),
      mimeType: item.mimeType || 'application/octet-stream',
    }));
}

function mapStats(stats: SolutionStat[] | null | undefined) {
  const items = (stats ?? []).filter((item) => item.label.trim() && item.value.trim());
  return items.length ? items.map((item) => ({ label: item.label, value: item.value })) : null;
}

function mapSplitSection(block: SolutionBlockDraft, copy: SolutionBlockLocaleCopy, locale: string) {
  const eyebrow = text(copy.smallTitle);
  const title = text(copy.largeTitle, eyebrow);
  const body = text(copy.description, title);
  const bullets = (block.items ?? [])
    .map((item) => {
      const itemCopy = pickLocaleCopy(item.locales, locale);
      const heading = text(itemCopy.largeTitle, itemCopy.smallTitle);
      const detail = text(itemCopy.description);
      if (heading && detail) return `${heading}: ${detail}`;
      return heading || detail;
    })
    .filter(Boolean);

  return {
    type: bullets.length ? 'clinical-split' : 'split-content',
    id: block.id,
    imagePosition: block.layout === 'image-right' ? 'right' : 'left',
    eyebrow: eyebrow || title,
    title: title || eyebrow || ' ',
    body: body || ' ',
    image: resolveOssAssetUrl(block.carouselImages?.find((slide) => slide.url.trim())?.url ?? ''),
    imageAlt: title || eyebrow,
    videoUrl: block.videoUrl?.trim() ? resolveOssAssetUrl(block.videoUrl) : '',
    gallery: (block.carouselImages ?? [])
      .map((slide) => ({
        url: slide.url?.trim() ? resolveOssAssetUrl(slide.url) : '',
        alt: title || eyebrow,
      }))
      .filter((item) => item.url),
    bullets,
  };
}

function mapSummarySection(
  block: SolutionBlockDraft,
  locale: string,
  uploadKeyById?: Map<string, string>,
) {
  const copy = pickLocaleCopy(block.locales, locale);
  const eyebrow = text(copy.smallTitle);
  const title = text(copy.largeTitle, eyebrow);
  const body = text(copy.description, title);
  const useCover = summaryItemUsesCoverImage(block);
  const cards = (block.items ?? []).map((item) => {
    const itemCopy = pickLocaleCopy(item.locales, locale);
    return {
      icon: isSummaryIcon(item.icon) ? item.icon : null,
      image: resolveStorefrontCoverUrl({
        mode: item.coverMode,
        value: item.coverValue,
        legacyCoverImageKey: item.coverImage,
        uploadKeyById,
        toPublicUrl: resolveOssAssetUrl,
      }),
      imageAlt: text(itemCopy.largeTitle, itemCopy.smallTitle),
      title: text(itemCopy.largeTitle, itemCopy.smallTitle) || ' ',
      body: text(itemCopy.description, ' '),
      cardStyle: useCover ? 'feature' : 'value',
    };
  });

  return {
    type: 'feature-grid',
    id: block.id,
    eyebrow: eyebrow || title,
    title: title || eyebrow || ' ',
    lead: body || ' ',
    grid: block.layout === 'multi-2' ? 'grid-2' : 'grid-3',
    cards,
  };
}

function mapSpecSection(
  block: SolutionBlockDraft,
  copy: SolutionBlockLocaleCopy,
  productParams: SolutionProductParam[],
) {
  const eyebrow = text(copy.smallTitle);
  const title = text(copy.largeTitle, eyebrow);
  return {
    type: 'spec-table',
    id: block.id,
    eyebrow: eyebrow || 'SPECIFICATIONS',
    title: title || 'Product Specifications',
    rows: productParams.filter((row) => row.label.trim() && row.value.trim()),
  };
}

async function mapRelatedProductsSection(
  block: SolutionBlockDraft,
  copy: SolutionBlockLocaleCopy,
  locale: string,
): Promise<StorefrontSolutionSection | null> {
  const productIds = (block.productIds ?? []).filter(Boolean);
  if (!productIds.length) return null;

  const activeRows = await db
    .select({
      id: products.id,
      coverMode: products.coverMode,
      coverValue: products.coverValue,
      coverImage: products.coverImage,
    })
    .from(products)
    .where(and(inArray(products.id, productIds), eq(products.status, 'active')));
  const activeIdSet = new Set(activeRows.map((row) => row.id));
  const coverById = new Map(activeRows.map((row) => [row.id, row]));
  if (!activeIdSet.size) return null;

  const translationMap = await loadProductTranslationsByProductIds(
    productIds.filter((id) => activeIdSet.has(id)),
  );

  const productCards = productIds.flatMap((id) => {
    if (!activeIdSet.has(id)) return [];
    const translation = pickProductTranslation(translationMap.get(id), locale);
    if (!translation) return [];
    const cover = coverImageFromProductFields(id, translation.name, coverById.get(id) ?? {}, translation.payload);
    return [{
      slug: translation.slug,
      href: `/products/${translation.slug}`,
      name: translation.name,
      badgeText: translation.badgeText || undefined,
      extraText: translation.extraText || undefined,
      shortDescription: translation.shortDescription,
      coverImage: cover?.url ?? '',
    }];
  });

  if (!productCards.length) return null;

  const eyebrow = text(copy.smallTitle);
  const title = text(copy.largeTitle, eyebrow);
  const body = text(copy.description);

  return {
    type: 'product-models',
    id: block.id,
    eyebrow: eyebrow || title,
    title: title || eyebrow || ' ',
    lead: body,
    products: productCards,
  };
}

async function mapBlocksToSections(
  blocks: SolutionBlockDraft[],
  locale: string,
  productParams: SolutionProductParam[],
  uploadKeyById?: Map<string, string>,
) {
  const sections: StorefrontSolutionSection[] = [];

  for (const block of blocks) {
    const copy = pickLocaleCopy(block.locales, locale);

    if (block.type === 'split') {
      sections.push(mapSplitSection(block, copy, locale));
      continue;
    }
    if (block.type === 'summary') {
      sections.push(mapSummarySection(block, locale, uploadKeyById));
      continue;
    }
    if (block.type === 'specifications') {
      sections.push(mapSpecSection(block, copy, productParams));
      continue;
    }
    if (block.type === 'relatedProducts') {
      const section = await mapRelatedProductsSection(block, copy, locale);
      if (section) sections.push(section);
      continue;
    }
    if (block.type === 'timeline' || block.type === 'course') {
      sections.push(mapSummarySection({ ...block, type: 'summary', layout: 'multi-3' }, locale, uploadKeyById));
    }
  }

  return sections;
}

async function loadFirstBoardLabel(solutionId: string, locale: string) {
  const links = await db
    .select({
      boardKey: productCoverageBoards.boardKey,
      translationLocale: productCoverageBoardTranslations.locale,
      translationName: productCoverageBoardTranslations.name,
    })
    .from(solutionBoardLinks)
    .innerJoin(productCoverageBoards, eq(productCoverageBoards.id, solutionBoardLinks.boardId))
    .leftJoin(productCoverageBoardTranslations, eq(productCoverageBoardTranslations.boardId, productCoverageBoards.id))
    .where(eq(solutionBoardLinks.solutionId, solutionId));

  if (!links.length) return { name: '', slug: '' };

  const boardKey = links[0].boardKey;
  const translations = links
    .filter((l) => l.translationLocale !== null)
    .map((l) => ({ locale: l.translationLocale!, name: l.translationName ?? '' }));

  const picked = pickLocaleRow(translations, locale);
  return {
    name: text(picked?.name, boardKey),
    slug: boardKey,
  };
}

function mapListItem(
  slug: string,
  cover: { coverMode?: string | null; coverValue?: string | null; coverImage?: string | null },
  translation: typeof solutionTranslations.$inferSelect,
  board: { name: string; slug: string },
  uploadKeyById?: Map<string, string>,
): StorefrontSolutionListItem {
  const title = text(translation.title, slug);
  return {
    slug,
    href: `/solutions/${slug}`,
    coverImage: resolveStorefrontCoverUrl({
      mode: cover.coverMode,
      value: cover.coverValue,
      legacyCoverImageKey: cover.coverImage,
      uploadKeyById,
      toPublicUrl: resolveOssAssetUrl,
    }),
    badgeText: text(translation.badgeText),
    categorySlug: board.slug,
    categoryLabel: board.name || board.slug,
    title,
    largeTitle: text(translation.largeTitle, title),
    description: text(translation.description),
    tags: (translation.tags ?? []).map((tag) => tag.trim()).filter(Boolean),
  };
}

export async function getStorefrontSolutionBySlug(
  slug: string,
  locale?: string,
): Promise<StorefrontSolutionDetail | null> {
  const requestedLocale = locale?.trim() || (await getDefaultSiteLanguageCode());
  const [row] = await db
    .select()
    .from(solutions)
    .where(and(eq(solutions.slug, slug), eq(solutions.status, 'published')))
    .limit(1);
  if (!row) return null;

  const [translations, contents, board] = await Promise.all([
    db.select().from(solutionTranslations).where(eq(solutionTranslations.solutionId, row.id)),
    db.select().from(solutionContents).where(eq(solutionContents.solutionId, row.id)).limit(1),
    loadFirstBoardLabel(row.id, requestedLocale),
  ]);

  const translation = pickLocaleRow(translations, requestedLocale) ?? pickTranslationForDisplay(translations, requestedLocale);
  if (!translation) return null;

  const productParams = (translation.productParams ?? []).filter((row) => row.label.trim() && row.value.trim());
  const blocks = (contents[0]?.blocks ?? []) as SolutionBlockDraft[];
  const pageTitle = text(translation.title, row.slug);
  const headline = text(translation.largeTitle, pageTitle);
  const related = await getStorefrontRandomSolutions({
    excludeSlug: row.slug,
    limit: 4,
    locale: requestedLocale,
  });

  let uploadUrl = '';
  const mediaIds: string[] = [
    ...collectCoverUploadIds([row]),
    ...collectCoverUploadIdsFromBlocks(blocks),
  ];
  if (row.backgroundMode === 'upload' && row.backgroundValue) {
    mediaIds.push(row.backgroundValue);
  }
  const uploadKeyById = await getAdminMediaAssetStorageKeys(mediaIds);
  if (row.backgroundMode === 'upload' && row.backgroundValue) {
    const key = uploadKeyById.get(row.backgroundValue);
    uploadUrl = key ? resolveOssAssetUrl(key) : '';
  }
  const bg = resolvePartnerCenterBackgroundDisplay({
    mode: row.backgroundMode ?? '',
    value: row.backgroundValue ?? '',
    uploadUrl,
    legacyBackgroundImage: row.backgroundImage ? resolveOssAssetUrl(row.backgroundImage) : '',
    fallbackSolidWhenEmpty: true,
  });

  return {
    slug: row.slug,
    locale: translation.locale,
    seo: {
      title: text(translation.seoTitle, pageTitle),
      description: text(translation.seoDescription, text(translation.description, pageTitle)),
    },
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Solutions', href: '/solutions' },
      { label: pageTitle },
    ],
    hero: {
      eyebrow: board.name ? `Solution · ${board.name}` : 'Solution',
      title: headline,
      lead: text(translation.description),
      image: resolveStorefrontCoverUrl({
        mode: row.coverMode,
        value: row.coverValue,
        legacyCoverImageKey: row.coverImage,
        uploadKeyById,
        toPublicUrl: resolveOssAssetUrl,
      }),
      imageAlt: headline,
      backgroundImage: bg.imageUrl,
      backgroundSolidCss: bg.solidCss,
      showCoverOnBackground: Boolean(row.showCoverOnBackground),
      videoUrl: row.videoUrl?.trim() ? resolveOssAssetUrl(row.videoUrl) : '',
      gallery: ((row.gallery ?? []) as Array<{ url?: string; alt?: string }>)
        .map((item) => ({
          url: item.url?.trim() ? resolveOssAssetUrl(item.url) : '',
          alt: item.alt?.trim() || headline,
        }))
        .filter((item) => item.url),
    },
    stats: mapStats(translation.stats),
    materials: mapMaterials(row.materials as SolutionMaterial[]),
    productParams,
    sections: await mapBlocksToSections(blocks, requestedLocale, productParams, uploadKeyById),
    related,
  };
}

export async function getStorefrontSolutionsList(input: {
  locale?: string;
  page?: number;
  pageSize?: number;
  board?: string | null;
  sort?: 'sortOrder' | 'createdAt';
}): Promise<StorefrontSolutionListResponse> {
  const locale = input.locale?.trim() || (await getDefaultSiteLanguageCode());
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, input.pageSize ?? 4));
  const boardKey = input.board?.trim() || null;
  const sortByCreatedAt = input.sort === 'createdAt';

  // Fetch all published solutions with their board links and translations
  const rows = await db
    .select({
      solution: solutions,
      translation: solutionTranslations,
      boardKey: productCoverageBoards.boardKey,
      boardTranslationLocale: productCoverageBoardTranslations.locale,
      boardTranslationName: productCoverageBoardTranslations.name,
    })
    .from(solutions)
    .innerJoin(solutionTranslations, eq(solutionTranslations.solutionId, solutions.id))
    .leftJoin(solutionBoardLinks, eq(solutionBoardLinks.solutionId, solutions.id))
    .leftJoin(productCoverageBoards, eq(productCoverageBoards.id, solutionBoardLinks.boardId))
    .leftJoin(
      productCoverageBoardTranslations,
      eq(productCoverageBoardTranslations.boardId, productCoverageBoards.id),
    )
    .where(eq(solutions.status, 'published'))
    .orderBy(
      ...(sortByCreatedAt
        ? [asc(solutions.createdAt), asc(solutions.slug)]
        : [asc(solutions.sortOrder), asc(solutions.slug)]),
    );

  type BoardEntry = { key: string; translations: Array<{ locale: string; name: string }> };
  const grouped = new Map<string, {
    solution: typeof solutions.$inferSelect;
    translations: Array<typeof solutionTranslations.$inferSelect>;
    boards: Map<string, BoardEntry>;
  }>();

  for (const row of rows) {
    const bucket = grouped.get(row.solution.id) ?? {
      solution: row.solution,
      translations: [],
      boards: new Map<string, BoardEntry>(),
    };
    if (!bucket.translations.some((t) => t.id === row.translation.id)) {
      bucket.translations.push(row.translation);
    }
    if (row.boardKey) {
      const boardEntry = bucket.boards.get(row.boardKey) ?? { key: row.boardKey, translations: [] };
      if (
        row.boardTranslationLocale
        && !boardEntry.translations.some((t) => t.locale === row.boardTranslationLocale)
      ) {
        boardEntry.translations.push({ locale: row.boardTranslationLocale, name: row.boardTranslationName ?? '' });
      }
      bucket.boards.set(row.boardKey, boardEntry);
    }
    grouped.set(row.solution.id, bucket);
  }

  const solutionRows = [...grouped.values()].map((entry) => entry.solution);
  const listCoverKeys = await getAdminMediaAssetStorageKeys(collectCoverUploadIds(solutionRows));

  let items = [...grouped.values()].flatMap((entry) => {
    const translation = pickLocaleRow(entry.translations, locale);
    if (!translation) return [];

    const boardEntries = [...entry.boards.values()];
    if (!boardEntries.length) {
      // Solution not linked to any board — include in "all" only
      return [{
        item: mapListItem(entry.solution.slug, entry.solution, translation, { name: '', slug: '' }, listCoverKeys),
        boardKeys: [] as string[],
      }];
    }

    // Use first board for display label, but track all board keys for filtering
    const firstBoard = boardEntries[0];
    const firstBoardDisplay = pickLocaleRow(firstBoard.translations, locale);
    const board = {
      name: text(firstBoardDisplay?.name, firstBoard.key),
      slug: firstBoard.key,
    };

    return [{
      item: mapListItem(entry.solution.slug, entry.solution, translation, board, listCoverKeys),
      boardKeys: boardEntries.map((b) => b.key),
    }];
  });

  if (boardKey && boardKey !== 'all') {
    items = items.filter((entry) => entry.boardKeys.includes(boardKey));
  }

  if (sortByCreatedAt) {
    const createdAtBySlug = new Map(
      [...grouped.values()].map((entry) => [
        entry.solution.slug,
        entry.solution.createdAt?.getTime() ?? 0,
      ]),
    );
    items = [...items].sort((a, b) => {
      const left = createdAtBySlug.get(a.item.slug) ?? 0;
      const right = createdAtBySlug.get(b.item.slug) ?? 0;
      if (left !== right) return left - right;
      return a.item.slug.localeCompare(b.item.slug);
    });
  }

  const total = items.length;
  const offset = (page - 1) * pageSize;

  return {
    locale,
    category: boardKey,
    page,
    pageSize,
    total,
    items: items.slice(offset, offset + pageSize).map((e) => e.item),
  };
}

export async function getStorefrontSolutionCategoryTabs(locale?: string): Promise<{
  locale: string;
  tabs: StorefrontSolutionCategoryTab[];
}> {
  const requestedLocale = locale?.trim() || (await getDefaultSiteLanguageCode());

  // Get all enabled boards with their translations, sorted by sortOrder
  const boards = await db
    .select({
      id: productCoverageBoards.id,
      boardKey: productCoverageBoards.boardKey,
      createdAt: productCoverageBoards.createdAt,
      translationLocale: productCoverageBoardTranslations.locale,
      translationName: productCoverageBoardTranslations.name,
    })
    .from(productCoverageBoards)
    .leftJoin(
      productCoverageBoardTranslations,
      eq(productCoverageBoardTranslations.boardId, productCoverageBoards.id),
    )
    .where(eq(productCoverageBoards.enabled, true))
    .orderBy(asc(productCoverageBoards.createdAt));

  // Group board translations
  const boardMap = new Map<string, { key: string; translations: Array<{ locale: string; name: string }> }>();
  for (const row of boards) {
    const entry = boardMap.get(row.boardKey) ?? { key: row.boardKey, translations: [] };
    if (row.translationLocale && !entry.translations.some((t) => t.locale === row.translationLocale)) {
      entry.translations.push({ locale: row.translationLocale, name: row.translationName ?? '' });
    }
    boardMap.set(row.boardKey, entry);
  }

  // Count solutions per board
  const linkCounts = await db
    .select({
      boardKey: productCoverageBoards.boardKey,
      count: sql<number>`count(distinct ${solutionBoardLinks.solutionId})`,
    })
    .from(solutionBoardLinks)
    .innerJoin(solutions, eq(solutions.id, solutionBoardLinks.solutionId))
    .innerJoin(productCoverageBoards, eq(productCoverageBoards.id, solutionBoardLinks.boardId))
    .where(eq(solutions.status, 'published'))
    .groupBy(productCoverageBoards.boardKey);

  const countByKey = new Map(linkCounts.map((row) => [row.boardKey, Number(row.count)]));

  // Count total published solutions
  const [totalRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(solutions)
    .where(eq(solutions.status, 'published'));
  const totalCount = Number(totalRow?.count ?? 0);

  const tabs: StorefrontSolutionCategoryTab[] = [
    {
      id: 'all',
      slug: null,
      label: requestedLocale.toLowerCase().startsWith('zh') ? '全部产品' : 'All Products',
      count: totalCount,
    },
  ];

  for (const [, entry] of boardMap) {
    const count = countByKey.get(entry.key) ?? 0;
    if (!count) continue;
    const display = pickLocaleRow(entry.translations, requestedLocale);
    tabs.push({
      id: entry.key,
      slug: entry.key,
      label: text(display?.name, entry.key),
      count,
    });
  }

  return { locale: requestedLocale, tabs };
}

export async function getStorefrontRandomSolutions(input: {
  excludeSlug?: string;
  limit?: number;
  locale?: string;
}): Promise<StorefrontSolutionListItem[]> {
  const locale = input.locale?.trim() || (await getDefaultSiteLanguageCode());
  const limit = Math.min(12, Math.max(1, input.limit ?? 4));
  const excludeSlug = input.excludeSlug?.trim();

  const conditions = [eq(solutions.status, 'published')];
  if (excludeSlug) {
    conditions.push(ne(solutions.slug, excludeSlug));
  }

  const rows = await db
    .select()
    .from(solutions)
    .where(and(...conditions))
    .orderBy(sql`random()`)
    .limit(limit);

  const uploadKeyById = await getAdminMediaAssetStorageKeys(collectCoverUploadIds(rows));

  const items: StorefrontSolutionListItem[] = [];
  for (const row of rows) {
    const translations = await db
      .select()
      .from(solutionTranslations)
      .where(eq(solutionTranslations.solutionId, row.id));
    const translation = pickLocaleRow(translations, locale);
    if (!translation) continue;
    const board = await loadFirstBoardLabel(row.id, locale);
    items.push(mapListItem(row.slug, row, translation, board, uploadKeyById));
  }
  return items;
}
