import 'server-only';

import { and, asc, eq, ne, sql } from 'drizzle-orm';

import type { SolutionBlockDraft, SolutionBlockLocaleCopy } from '@/lib/solution-blocks';
import { isSummaryIcon, pickBlockLocaleCopy, summaryItemUsesCoverImage } from '@/lib/solution-blocks';
import { resolveOssAssetUrl } from '@/lib/oss-asset-url';
import { pickTranslationForDisplay } from '@/lib/pick-translation-for-display';
import type { SolutionMaterial, SolutionProductParam, SolutionStat } from '@/lib/solution-content';
import { db } from '@/server/db';
import {
  categories,
  categoryTranslations,
  solutionContents,
  solutionTranslations,
  solutions,
} from '@/server/db/schema';
import { getDefaultSiteLanguageCode } from '@/server/admin/site-locale';

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
    bullets,
  };
}

function mapSummarySection(block: SolutionBlockDraft, locale: string) {
  const copy = pickLocaleCopy(block.locales, locale);
  const eyebrow = text(copy.smallTitle);
  const title = text(copy.largeTitle, eyebrow);
  const body = text(copy.description, title);
  const useCover = summaryItemUsesCoverImage(block);
  const cards = (block.items ?? []).map((item) => {
    const itemCopy = pickLocaleCopy(item.locales, locale);
    return {
      icon: isSummaryIcon(item.icon) ? item.icon : 'layers',
      image: resolveOssAssetUrl(item.coverImage ?? ''),
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

function mapBlocksToSections(
  blocks: SolutionBlockDraft[],
  locale: string,
  productParams: SolutionProductParam[],
) {
  const sections: StorefrontSolutionSection[] = [];

  for (const block of blocks) {
    const copy = pickLocaleCopy(block.locales, locale);

    if (block.type === 'split') {
      sections.push(mapSplitSection(block, copy, locale));
      continue;
    }
    if (block.type === 'summary') {
      sections.push(mapSummarySection(block, locale));
      continue;
    }
    if (block.type === 'specifications') {
      sections.push(mapSpecSection(block, copy, productParams));
      continue;
    }
    if (block.type === 'timeline' || block.type === 'course') {
      sections.push(mapSummarySection({ ...block, type: 'summary', layout: 'multi-3' }, locale));
    }
  }

  return sections;
}

async function loadCategoryLabel(categoryId: string, locale: string) {
  const rows = await db
    .select({
      locale: categoryTranslations.locale,
      name: categoryTranslations.name,
      slug: categoryTranslations.slug,
    })
    .from(categoryTranslations)
    .where(eq(categoryTranslations.categoryId, categoryId));
  const picked = pickLocaleRow(rows, locale);
  return {
    name: text(picked?.name, ''),
    slug: text(picked?.slug, ''),
  };
}

function mapListItem(
  slug: string,
  coverImage: string,
  translation: typeof solutionTranslations.$inferSelect,
  category: { name: string; slug: string },
): StorefrontSolutionListItem {
  const title = text(translation.title, slug);
  return {
    slug,
    href: `/solutions/${slug}`,
    coverImage: resolveOssAssetUrl(coverImage),
    badgeText: text(translation.badgeText),
    categorySlug: category.slug,
    categoryLabel: category.name || category.slug,
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

  const [translations, contents, category] = await Promise.all([
    db.select().from(solutionTranslations).where(eq(solutionTranslations.solutionId, row.id)),
    db.select().from(solutionContents).where(eq(solutionContents.solutionId, row.id)).limit(1),
    loadCategoryLabel(row.categoryId, requestedLocale),
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
      eyebrow: category.name ? `Solution · ${category.name}` : 'Solution',
      title: headline,
      lead: text(translation.description),
      image: resolveOssAssetUrl(row.coverImage),
      imageAlt: headline,
    },
    stats: mapStats(translation.stats),
    materials: mapMaterials(row.materials as SolutionMaterial[]),
    productParams,
    sections: mapBlocksToSections(blocks, requestedLocale, productParams),
    related,
  };
}

export async function getStorefrontSolutionsList(input: {
  locale?: string;
  page?: number;
  pageSize?: number;
  category?: string | null;
}): Promise<StorefrontSolutionListResponse> {
  const locale = input.locale?.trim() || (await getDefaultSiteLanguageCode());
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, input.pageSize ?? 4));
  const categorySlug = input.category?.trim() || null;

  const rows = await db
    .select({
      solution: solutions,
      translation: solutionTranslations,
      categorySlug: categoryTranslations.slug,
      categoryName: categoryTranslations.name,
      categoryLocale: categoryTranslations.locale,
    })
    .from(solutions)
    .innerJoin(solutionTranslations, eq(solutionTranslations.solutionId, solutions.id))
    .innerJoin(categories, eq(categories.id, solutions.categoryId))
    .innerJoin(categoryTranslations, eq(categoryTranslations.categoryId, categories.id))
    .where(eq(solutions.status, 'published'))
    .orderBy(asc(solutions.sortOrder), asc(solutions.slug));

  const grouped = new Map<string, {
    solution: typeof solutions.$inferSelect;
    translations: Array<typeof solutionTranslations.$inferSelect>;
    categories: Array<{ slug: string; name: string; locale: string }>;
  }>();

  for (const row of rows) {
    const bucket = grouped.get(row.solution.id) ?? {
      solution: row.solution,
      translations: [],
      categories: [],
    };
    if (!bucket.translations.some((item) => item.id === row.translation.id)) {
      bucket.translations.push(row.translation);
    }
    if (!bucket.categories.some((item) => item.locale === row.categoryLocale && item.slug === row.categorySlug)) {
      bucket.categories.push({
        slug: row.categorySlug,
        name: row.categoryName,
        locale: row.categoryLocale,
      });
    }
    grouped.set(row.solution.id, bucket);
  }

  let items = [...grouped.values()].map((entry) => {
    const translation = pickLocaleRow(entry.translations, locale);
    const category = pickLocaleRow(entry.categories, locale);
    if (!translation || !category) return null;
    return mapListItem(entry.solution.slug, entry.solution.coverImage, translation, category);
  }).filter((item): item is StorefrontSolutionListItem => Boolean(item));

  if (categorySlug && categorySlug !== 'all') {
    items = items.filter((item) => item.categorySlug === categorySlug);
  }

  const total = items.length;
  const offset = (page - 1) * pageSize;

  return {
    locale,
    category: categorySlug,
    page,
    pageSize,
    total,
    items: items.slice(offset, offset + pageSize),
  };
}

export async function getStorefrontSolutionCategoryTabs(locale?: string): Promise<{
  locale: string;
  tabs: StorefrontSolutionCategoryTab[];
}> {
  const requestedLocale = locale?.trim() || (await getDefaultSiteLanguageCode());
  const list = await getStorefrontSolutionsList({
    locale: requestedLocale,
    page: 1,
    pageSize: 500,
  });

  const counts = new Map<string, { slug: string; label: string; count: number }>();
  for (const item of list.items) {
    const current = counts.get(item.categorySlug) ?? {
      slug: item.categorySlug,
      label: item.categoryLabel,
      count: 0,
    };
    current.count += 1;
    counts.set(item.categorySlug, current);
  }

  const categoryRows = await db
    .select({
      sortOrder: categories.sortOrder,
      slug: categoryTranslations.slug,
    })
    .from(categories)
    .innerJoin(categoryTranslations, eq(categoryTranslations.categoryId, categories.id));

  const sortBySlug = new Map<string, number>();
  for (const row of categoryRows) {
    const current = sortBySlug.get(row.slug);
    if (current === undefined || row.sortOrder < current) {
      sortBySlug.set(row.slug, row.sortOrder);
    }
  }

  const tabs: StorefrontSolutionCategoryTab[] = [
    { id: 'all', slug: null, label: requestedLocale.toLowerCase().startsWith('zh') ? '全部产品' : 'All Products', count: list.total },
    ...[...counts.values()]
      .sort((left, right) => (sortBySlug.get(left.slug) ?? 999) - (sortBySlug.get(right.slug) ?? 999))
      .map((item) => ({
        id: item.slug,
        slug: item.slug,
        label: item.label,
        count: item.count,
      })),
  ];

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

  const items: StorefrontSolutionListItem[] = [];
  for (const row of rows) {
    const translations = await db
      .select()
      .from(solutionTranslations)
      .where(eq(solutionTranslations.solutionId, row.id));
    const translation = pickLocaleRow(translations, locale);
    if (!translation) continue;
    const category = await loadCategoryLabel(row.categoryId, locale);
    items.push(mapListItem(row.slug, row.coverImage, translation, category));
  }
  return items;
}
