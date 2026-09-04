import 'server-only';

import { and, asc, desc, eq } from 'drizzle-orm';

import { resolveBlogCategorySlug } from '@/lib/blog-categories';
import {
  type EditorialContentPayload,
} from '@/lib/editorial-content';
import { resolveOssAssetUrl, rewriteHtmlOssAssets } from '@/lib/oss-asset-url';
import { resolveStorefrontCoverUrl } from '@/lib/cover-presets';
import { normalizeSlug } from '@/lib/slug';
import { db } from '@/server/db';
import {
  editorialContentBoards,
  editorialContentTranslations,
  editorialContents,
} from '@/server/db/schema';

type TranslationRow = typeof editorialContentTranslations.$inferSelect;

export type StorefrontBlogAuthor = {
  name: string | null;
  title: string | null;
  bio: string | null;
};

export function editorialLocale(localeInput?: string | null) {
  return localeInput?.trim() || 'en';
}

export function pickTranslation(rows: TranslationRow[], locale: string) {
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

function normalizeCoverStyle(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 10) {
    return null;
  }
  return value;
}

export function normalizePayload(payload: unknown): EditorialContentPayload {
  const value = (payload ?? {}) as Partial<EditorialContentPayload>;
  return {
    body: typeof value.body === 'string' ? value.body : '',
    coverStyle: normalizeCoverStyle(value.coverStyle),
    tags: Array.isArray(value.tags) ? value.tags.filter((item): item is string => typeof item === 'string') : [],
    relatedProductSlugs: Array.isArray(value.relatedProductSlugs)
      ? value.relatedProductSlugs.filter((item): item is string => typeof item === 'string')
      : [],
    authorName: typeof value.authorName === 'string' ? value.authorName : null,
    authorTitle: typeof value.authorTitle === 'string' ? value.authorTitle : null,
    authorBio: typeof value.authorBio === 'string' ? value.authorBio : null,
    category: typeof value.category === 'string' ? value.category : null,
  };
}

export function buildAuthor(payload: EditorialContentPayload): StorefrontBlogAuthor {
  return {
    name: payload.authorName ?? null,
    title: payload.authorTitle ?? null,
    bio: payload.authorBio ?? null,
  };
}

export async function getStorefrontBoardFaqs(boardKeyInput: string, localeInput?: string | null) {
  const locale = editorialLocale(localeInput);
  const boardKey = boardKeyInput.trim();
  if (!boardKey.trim()) {
    return { locale, boardKey, items: [] as { id: string; title: string; body: string }[] };
  }

  const rows = await db
    .select({
      content: editorialContents,
      translation: editorialContentTranslations,
    })
    .from(editorialContents)
    .innerJoin(editorialContentBoards, eq(editorialContentBoards.contentId, editorialContents.id))
    .innerJoin(editorialContentTranslations, eq(editorialContentTranslations.contentId, editorialContents.id))
    .where(and(
      eq(editorialContents.status, 'published'),
      eq(editorialContents.contentModule, 'faq'),
      eq(editorialContentBoards.boardKey, boardKey),
    ))
    .orderBy(desc(editorialContents.publishedAt), asc(editorialContentTranslations.title));

  const grouped = new Map<string, { content: typeof editorialContents.$inferSelect; translations: TranslationRow[] }>();
  for (const row of rows) {
    const bucket = grouped.get(row.content.id) ?? { content: row.content, translations: [] };
    bucket.translations.push(row.translation);
    grouped.set(row.content.id, bucket);
  }

  const items = [...grouped.values()].map(({ content, translations }) => {
    const picked = pickTranslation(translations, locale)!;
    const payload = normalizePayload(picked.payload);
    return {
      id: content.id,
      title: picked.title,
      body: rewriteHtmlOssAssets(payload.body, 'toPublicUrl'),
    };
  });

  return { locale, boardKey, items };
}

export async function getStorefrontBoardBlogs(boardKeyInput: string, localeInput?: string | null) {
  const locale = editorialLocale(localeInput);
  const boardKey = boardKeyInput.trim();
  if (!boardKey.trim()) {
    return {
      locale,
      boardKey,
      items: [] as {
        id: string;
        title: string;
        summary: string | null;
        slug: string;
        category: string | null;
        categorySlug: string | null;
        coverStyle: number | null;
        coverImage: string | null;
        author: StorefrontBlogAuthor;
        tags: string[];
        publishedAt: string | null;
      }[],
    };
  }

  const rows = await db
    .select({
      content: editorialContents,
      translation: editorialContentTranslations,
    })
    .from(editorialContents)
    .innerJoin(editorialContentBoards, eq(editorialContentBoards.contentId, editorialContents.id))
    .innerJoin(editorialContentTranslations, eq(editorialContentTranslations.contentId, editorialContents.id))
    .where(and(
      eq(editorialContents.status, 'published'),
      eq(editorialContents.contentModule, 'editorial'),
      eq(editorialContentBoards.boardKey, boardKey),
    ))
    .orderBy(desc(editorialContents.publishedAt), asc(editorialContentTranslations.title));

  const grouped = new Map<string, { content: typeof editorialContents.$inferSelect; translations: TranslationRow[] }>();
  for (const row of rows) {
    const bucket = grouped.get(row.content.id) ?? { content: row.content, translations: [] };
    bucket.translations.push(row.translation);
    grouped.set(row.content.id, bucket);
  }

  const items = [...grouped.values()].map(({ content, translations }) => {
    const picked = pickTranslation(translations, locale)!;
    const payload = normalizePayload(picked.payload);
    return {
      id: content.id,
      title: picked.title,
      summary: picked.summary,
      slug: picked.slug,
      category: payload.category,
      categorySlug: resolveBlogCategorySlug(payload.category),
      coverStyle: payload.coverStyle,
      coverImage: resolveStorefrontCoverUrl({
        mode: content.coverMode,
        value: content.coverValue,
        legacyCoverImageKey: content.coverImage,
        toPublicUrl: resolveOssAssetUrl,
      }) || null,
      author: buildAuthor(payload),
      tags: payload.tags,
      publishedAt: content.publishedAt?.toISOString() ?? null,
    };
  });

  return { locale, boardKey, items };
}

export type StorefrontBoardContentModule = 'editorial' | 'faq';

export type StorefrontBoardContentItem = {
  id: string;
  title: string;
  module: StorefrontBoardContentModule;
  summary: string | null;
  slug: string | null;
  body: string | null;
  category: string | null;
  categorySlug: string | null;
  coverStyle: number | null;
  coverImage: string | null;
  author: StorefrontBlogAuthor | null;
  tags: string[];
  publishedAt: string | null;
};

export async function getStorefrontBoardContent(
  boardKeyInput: string,
  localeInput?: string | null,
  moduleInput: StorefrontBoardContentModule = 'editorial',
) {
  const locale = editorialLocale(localeInput);
  const boardKey = boardKeyInput.trim();
  const module = moduleInput === 'faq' ? 'faq' : 'editorial';

  if (!boardKey) {
    return { locale, boardKey, module, items: [] as StorefrontBoardContentItem[] };
  }

  if (module === 'faq') {
    const faqs = await getStorefrontBoardFaqs(boardKey, locale);
    return {
      locale: faqs.locale,
      boardKey: faqs.boardKey,
      module,
      items: faqs.items.map((item) => ({
        id: item.id,
        title: item.title,
        module,
        summary: null,
        slug: null,
        body: item.body,
        category: null,
        categorySlug: null,
        coverStyle: null,
        coverImage: null,
        author: null,
        tags: [],
        publishedAt: null,
      })),
    };
  }

  const blogs = await getStorefrontBoardBlogs(boardKey, locale);
  return {
    locale: blogs.locale,
    boardKey: blogs.boardKey,
    module,
    items: blogs.items.map((item) => ({
      id: item.id,
      title: item.title,
      module,
      summary: item.summary,
      slug: item.slug,
      body: null,
      category: item.category,
      categorySlug: item.categorySlug,
      coverStyle: item.coverStyle,
      coverImage: item.coverImage,
      author: item.author,
      tags: item.tags,
      publishedAt: item.publishedAt,
    })),
  };
}

export async function getStorefrontBlogDetailBySlug(slugInput: string, localeInput?: string | null) {
  const { getStorefrontInsightDetailBySlug } = await import('@/server/storefront/insights');
  return getStorefrontInsightDetailBySlug(slugInput, localeInput);
}

export type StorefrontOtherContentDetail = {
  id: string;
  title: string;
  summary: string | null;
  body: string;
  slug: string;
  coverImage: string | null;
  seo: {
    title: string | null;
    description: string | null;
  };
  publishedAt: string | null;
  createdAt: string | null;
};

export async function getStorefrontOtherContentBySlug(
  slugInput: string,
  localeInput?: string | null,
): Promise<StorefrontOtherContentDetail | null> {
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
      eq(editorialContentTranslations.contentModule, 'other'),
      eq(editorialContents.status, 'published'),
      eq(editorialContents.contentModule, 'other'),
    ));

  if (!rows.length) return null;

  const preferred = rows.find((row) => row.translation.locale === locale)
    ?? rows.find((row) => row.translation.locale.toLowerCase().startsWith('en'))
    ?? rows[0];
  if (!preferred) return null;

  const translations = await db
    .select()
    .from(editorialContentTranslations)
    .where(eq(editorialContentTranslations.contentId, preferred.content.id));

  const picked = pickTranslation(translations, locale) ?? preferred.translation;
  const payload = normalizePayload(picked.payload);
  const content = preferred.content;

  return {
    id: content.id,
    title: picked.title,
    summary: picked.summary,
    body: rewriteHtmlOssAssets(payload.body, 'toPublicUrl'),
    slug: picked.slug,
    coverImage: resolveStorefrontCoverUrl({
      mode: content.coverMode,
      value: content.coverValue,
      legacyCoverImageKey: content.coverImage,
      toPublicUrl: resolveOssAssetUrl,
    }) || null,
    seo: {
      title: picked.seoTitle,
      description: picked.seoDescription,
    },
    publishedAt: content.publishedAt?.toISOString() ?? null,
    createdAt: content.createdAt?.toISOString() ?? null,
  };
}
