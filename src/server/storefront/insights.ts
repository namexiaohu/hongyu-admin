import 'server-only';

import { and, asc, desc, eq, inArray, ne, sql } from 'drizzle-orm';

import { resolveBlogCategorySlug } from '@/lib/blog-categories';
import { type EditorialContentPayload } from '@/lib/editorial-content';
import { resolveOssAssetUrl } from '@/lib/oss-asset-url';
import { normalizeSlug } from '@/lib/slug';
import { db } from '@/server/db';
import {
  editorialContentBoards,
  editorialContentTranslations,
  editorialContents,
  editorialCoverageBoards,
  editorialCoverageBoardTranslations,
} from '@/server/db/schema';

import {
  buildAuthor,
  editorialLocale,
  normalizePayload,
  pickTranslation,
  type StorefrontBlogAuthor,
} from '@/server/storefront/editorial-content';

export const INSIGHT_BOARD_KEYS = ['case', 'paper', 'experience'] as const;
export type InsightBoardKey = (typeof INSIGHT_BOARD_KEYS)[number];

type TranslationRow = typeof editorialContentTranslations.$inferSelect;
type ContentRow = typeof editorialContents.$inferSelect;

export type StorefrontInsightListItem = {
  id: string;
  title: string;
  summary: string | null;
  slug: string;
  boardKey: string;
  boardName: string;
  coverImage: string | null;
  author: StorefrontBlogAuthor;
  createdAt: string | null;
  publishedAt: string | null;
};

export type StorefrontInsightBoardCount = {
  boardKey: string;
  name: string;
  count: number;
};

export type StorefrontInsightRelatedItem = {
  id: string;
  title: string;
  slug: string;
  boardKey: string;
  boardName: string;
  coverImage: string | null;
  createdAt: string | null;
};

export type StorefrontInsightDetail = {
  id: string;
  title: string;
  summary: string | null;
  body: string;
  slug: string;
  boardKey: string;
  boardName: string;
  category: string | null;
  categorySlug: string | null;
  coverStyle: number | null;
  coverImage: string | null;
  author: StorefrontBlogAuthor;
  seo: {
    title: string | null;
    description: string | null;
  };
  createdAt: string | null;
  publishedAt: string | null;
  boardKeys: string[];
  tags: string[];
  relatedProductSlugs: string[];
  relatedReading: StorefrontInsightRelatedItem[];
  relatedArticles: StorefrontInsightRelatedItem[];
};

function pickBoardName(rows: Array<{ locale: string; name: string }>, locale: string) {
  if (!rows.length) return '';
  const normalized = locale.trim().toLowerCase();
  const exact = rows.find((row) => row.locale.toLowerCase() === normalized);
  if (exact) return exact.name;
  const prefix = normalized.split('-')[0];
  const prefixMatch = rows.find((row) => {
    const rowLocale = row.locale.toLowerCase();
    return rowLocale === prefix || rowLocale.startsWith(`${prefix}-`);
  });
  if (prefixMatch) return prefixMatch.name;
  const english = rows.find((row) => row.locale.toLowerCase().startsWith('en'));
  return english?.name ?? rows[0]?.name ?? '';
}

async function loadBoardNameMap(locale: string) {
  const rows = await db
    .select({
      boardKey: editorialCoverageBoards.boardKey,
      locale: editorialCoverageBoardTranslations.locale,
      name: editorialCoverageBoardTranslations.name,
    })
    .from(editorialCoverageBoards)
    .innerJoin(
      editorialCoverageBoardTranslations,
      eq(editorialCoverageBoardTranslations.boardId, editorialCoverageBoards.id),
    )
    .where(inArray(editorialCoverageBoards.boardKey, [...INSIGHT_BOARD_KEYS]));

  const map = new Map<string, string>();
  for (const boardKey of INSIGHT_BOARD_KEYS) {
    const translations = rows.filter((row) => row.boardKey === boardKey);
    map.set(boardKey, pickBoardName(translations, locale) || boardKey);
  }
  return map;
}

function boardNameFromMap(map: Map<string, string>, boardKey: string) {
  return map.get(boardKey) ?? boardKey;
}

async function loadInsightRows(boardKey?: string | null) {
  const conditions = [
    eq(editorialContents.status, 'published'),
    eq(editorialContents.contentModule, 'editorial'),
    inArray(editorialContentBoards.boardKey, [...INSIGHT_BOARD_KEYS]),
  ];

  if (boardKey?.trim()) {
    conditions.push(eq(editorialContentBoards.boardKey, boardKey.trim()));
  }

  return db
    .select({
      content: editorialContents,
      translation: editorialContentTranslations,
      boardKey: editorialContentBoards.boardKey,
    })
    .from(editorialContents)
    .innerJoin(editorialContentBoards, eq(editorialContentBoards.contentId, editorialContents.id))
    .innerJoin(editorialContentTranslations, eq(editorialContentTranslations.contentId, editorialContents.id))
    .where(and(...conditions))
    .orderBy(desc(editorialContents.createdAt), asc(editorialContentTranslations.title));
}

function groupInsightRows(
  rows: Array<{ content: ContentRow; translation: TranslationRow; boardKey: string }>,
  locale: string,
) {
  const grouped = new Map<
    string,
    { content: ContentRow; translations: TranslationRow[]; boardKey: string }
  >();

  for (const row of rows) {
    const bucket = grouped.get(row.content.id) ?? {
      content: row.content,
      translations: [],
      boardKey: row.boardKey,
    };
    bucket.translations.push(row.translation);
    grouped.set(row.content.id, bucket);
  }

  return [...grouped.values()]
    .map(({ content, translations, boardKey }) => {
      const picked = pickTranslation(translations, locale);
      if (!picked) return null;
      return { content, picked, boardKey };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
}

function mapListItem(
  content: ContentRow,
  picked: TranslationRow,
  boardKey: string,
  boardName: string,
): StorefrontInsightListItem {
  const payload = normalizePayload(picked.payload);
  return {
    id: content.id,
    title: picked.title,
    summary: picked.summary,
    slug: picked.slug,
    boardKey,
    boardName,
    coverImage: resolveOssAssetUrl(content.coverImage) || null,
    author: buildAuthor(payload),
    createdAt: content.createdAt?.toISOString() ?? null,
    publishedAt: content.publishedAt?.toISOString() ?? null,
  };
}

function mapRelatedItem(
  content: ContentRow,
  picked: TranslationRow,
  boardKey: string,
  boardName: string,
): StorefrontInsightRelatedItem {
  return {
    id: content.id,
    title: picked.title,
    slug: picked.slug,
    boardKey,
    boardName,
    coverImage: resolveOssAssetUrl(content.coverImage) || null,
    createdAt: content.createdAt?.toISOString() ?? null,
  };
}

export async function getStorefrontInsightsList(input: {
  boardKey?: string | null;
  locale?: string | null;
  page?: number;
  pageSize?: number;
}) {
  const locale = editorialLocale(input.locale);
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, input.pageSize ?? 6));
  const boardKey = input.boardKey?.trim() || null;

  const [boardNames, rows] = await Promise.all([
    loadBoardNameMap(locale),
    loadInsightRows(boardKey),
  ]);

  const items = groupInsightRows(rows, locale).map(({ content, picked, boardKey: key }) =>
    mapListItem(content, picked, key, boardNameFromMap(boardNames, key)),
  );

  const total = items.length;
  const offset = (page - 1) * pageSize;
  const pageItems = items.slice(offset, offset + pageSize);

  return {
    locale,
    boardKey,
    items: pageItems,
    total,
    page,
    pageSize,
  };
}

export async function getStorefrontInsightsBoardCounts(localeInput?: string | null) {
  const locale = editorialLocale(localeInput);
  const [boardNames, rows] = await Promise.all([
    loadBoardNameMap(locale),
    loadInsightRows(),
  ]);

  const grouped = groupInsightRows(rows, locale);
  const counts = new Map<string, number>();
  for (const key of INSIGHT_BOARD_KEYS) {
    counts.set(key, 0);
  }
  for (const item of grouped) {
    counts.set(item.boardKey, (counts.get(item.boardKey) ?? 0) + 1);
  }

  const boards: StorefrontInsightBoardCount[] = INSIGHT_BOARD_KEYS.map((boardKey) => ({
    boardKey,
    name: boardNameFromMap(boardNames, boardKey),
    count: counts.get(boardKey) ?? 0,
  }));

  return {
    locale,
    total: grouped.length,
    boards,
  };
}

export async function getStorefrontRandomInsights(input: {
  limit?: number;
  excludeIds?: string[];
  locale?: string | null;
}) {
  const locale = editorialLocale(input.locale);
  const limit = Math.min(20, Math.max(1, input.limit ?? 6));
  const excludeIds = input.excludeIds ?? [];

  const excludeClause = excludeIds.length
    ? sql`${editorialContents.id} NOT IN (${sql.join(excludeIds.map((id) => sql`${id}`), sql`, `)})`
    : sql`true`;

  const rows = await db
    .select({
      content: editorialContents,
      translation: editorialContentTranslations,
      boardKey: editorialContentBoards.boardKey,
    })
    .from(editorialContents)
    .innerJoin(editorialContentBoards, eq(editorialContentBoards.contentId, editorialContents.id))
    .innerJoin(editorialContentTranslations, eq(editorialContentTranslations.contentId, editorialContents.id))
    .where(and(
      eq(editorialContents.status, 'published'),
      eq(editorialContents.contentModule, 'editorial'),
      inArray(editorialContentBoards.boardKey, [...INSIGHT_BOARD_KEYS]),
      excludeClause,
    ))
    .orderBy(sql`random()`)
    .limit(limit * 3);

  const boardNames = await loadBoardNameMap(locale);
  const grouped = groupInsightRows(rows, locale).slice(0, limit);

  return {
    locale,
    items: grouped.map(({ content, picked, boardKey }) =>
      mapRelatedItem(content, picked, boardKey, boardNameFromMap(boardNames, boardKey)),
    ),
  };
}

async function loadPrimaryBoardKey(contentId: string) {
  const [row] = await db
    .select({ boardKey: editorialContentBoards.boardKey })
    .from(editorialContentBoards)
    .where(and(
      eq(editorialContentBoards.contentId, contentId),
      inArray(editorialContentBoards.boardKey, [...INSIGHT_BOARD_KEYS]),
    ))
    .orderBy(asc(editorialContentBoards.boardKey))
    .limit(1);
  return row?.boardKey ?? 'case';
}

export async function getStorefrontInsightDetailBySlug(slugInput: string, localeInput?: string | null) {
  const locale = editorialLocale(localeInput);
  const slug = normalizeSlug(slugInput);
  if (!slug) return null;

  const rows = await db
    .select({
      content: editorialContents,
      translation: editorialContentTranslations,
    })
    .from(editorialContentTranslations)
    .innerJoin(editorialContents, eq(editorialContents.id, editorialContentTranslations.contentId))
    .where(and(
      eq(editorialContentTranslations.slug, slug),
      eq(editorialContentTranslations.contentModule, 'editorial'),
      eq(editorialContents.status, 'published'),
      eq(editorialContents.contentModule, 'editorial'),
    ));

  if (!rows.length) return null;

  const preferred = rows.find((row) => row.translation.locale === locale)
    ?? rows.find((row) => row.translation.locale.toLowerCase().startsWith('en'))
    ?? rows[0];
  if (!preferred) return null;

  const content = preferred.content;
  const contentId = content.id;

  const translations = await db
    .select()
    .from(editorialContentTranslations)
    .where(eq(editorialContentTranslations.contentId, contentId));

  const picked = pickTranslation(translations, locale) ?? preferred.translation;
  const payload = normalizePayload(picked.payload);
  const boardKey = await loadPrimaryBoardKey(contentId);
  const boardNames = await loadBoardNameMap(locale);
  const boardName = boardNameFromMap(boardNames, boardKey);

  const boardKeys = await db
    .select({ boardKey: editorialContentBoards.boardKey })
    .from(editorialContentBoards)
    .where(eq(editorialContentBoards.contentId, contentId))
    .orderBy(asc(editorialContentBoards.boardKey));

  const relatedRows = await db
    .select({
      content: editorialContents,
      translation: editorialContentTranslations,
      boardKey: editorialContentBoards.boardKey,
    })
    .from(editorialContents)
    .innerJoin(editorialContentBoards, eq(editorialContentBoards.contentId, editorialContents.id))
    .innerJoin(editorialContentTranslations, eq(editorialContentTranslations.contentId, editorialContents.id))
    .where(and(
      eq(editorialContents.status, 'published'),
      eq(editorialContents.contentModule, 'editorial'),
      eq(editorialContentBoards.boardKey, boardKey),
      ne(editorialContents.id, contentId),
    ))
    .orderBy(desc(editorialContents.createdAt))
    .limit(20);

  const relatedGrouped = groupInsightRows(relatedRows, locale).slice(0, 4);
  const randomResult = await getStorefrontRandomInsights({
    limit: 4,
    excludeIds: [contentId],
    locale,
  });

  const detail: StorefrontInsightDetail = {
    id: content.id,
    title: picked.title,
    summary: picked.summary,
    body: payload.body,
    slug: picked.slug,
    boardKey,
    boardName,
    category: payload.category,
    categorySlug: resolveBlogCategorySlug(payload.category),
    coverStyle: payload.coverStyle,
    coverImage: resolveOssAssetUrl(content.coverImage) || null,
    author: buildAuthor(payload),
    seo: {
      title: picked.seoTitle,
      description: picked.seoDescription,
    },
    createdAt: content.createdAt?.toISOString() ?? null,
    publishedAt: content.publishedAt?.toISOString() ?? null,
    boardKeys: boardKeys.map((row) => row.boardKey),
    tags: payload.tags,
    relatedProductSlugs: payload.relatedProductSlugs,
    relatedReading: relatedGrouped.map(({ content: c, picked: t, boardKey: key }) =>
      mapRelatedItem(c, t, key, boardNameFromMap(boardNames, key)),
    ),
    relatedArticles: randomResult.items,
  };

  return detail;
}
