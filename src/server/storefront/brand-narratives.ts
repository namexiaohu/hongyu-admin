import 'server-only';

import { and, asc, eq } from 'drizzle-orm';

import type { BrandNarrativeBlockDraft, BrandNarrativeBlockLocaleCopy } from '@/lib/brand-narrative-blocks';
import { isSummaryIcon, pickBlockLocaleCopy, summaryItemUsesCoverImage } from '@/lib/brand-narrative-blocks';
import { resolveNarrativePageMeta } from '@/lib/brand-narrative-content';
import { pickTranslationForDisplay } from '@/lib/pick-translation-for-display';
import { db } from '@/server/db';
import { brandNarrativeContents, brandNarrativeTranslations, brandNarratives } from '@/server/db/schema';
import { getDefaultSiteLanguageCode } from '@/server/admin/site-locale';

export type BrandNarrativePageData = {
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
  stats?: Array<{ value: string; label: string; suffix?: string }> | null;
  sections: Array<Record<string, unknown>>;
};

const SOFT_BACKGROUND_BLOCK_IDS = new Set(['values', 'certs', 'outlook', 'rd']);

function pickLocaleCopy(
  locales: Record<string, BrandNarrativeBlockLocaleCopy> | undefined,
  locale: string,
): BrandNarrativeBlockLocaleCopy {
  return pickBlockLocaleCopy(locales, locale);
}

function text(value: string | undefined, fallback = '') {
  return value?.trim() || fallback;
}

function blockBackground(block: BrandNarrativeBlockDraft) {
  return SOFT_BACKGROUND_BLOCK_IDS.has(block.id) ? 'soft' as const : undefined;
}

function isPatentId(value: string) {
  return /^(CN|PCT\/CN)/i.test(value.trim());
}

function mapSplitSection(
  block: BrandNarrativeBlockDraft,
  copy: BrandNarrativeBlockLocaleCopy,
  slug: string,
) {
  const eyebrow = text(copy.smallTitle);
  const title = text(copy.largeTitle, eyebrow);
  const body = text(copy.description, title);

  return {
    type: 'split-content',
    id: block.id,
    background: blockBackground(block),
    layout: slug === 'patents' ? 'rd-split' as const : 'team-split' as const,
    imagePosition: block.layout === 'image-right' ? 'right' as const : 'left' as const,
    eyebrow: eyebrow || title,
    title: title || eyebrow || ' ',
    body: body || ' ',
    image: block.carouselImages?.find((slide) => slide.url.trim())?.url ?? '',
    imageAlt: title || eyebrow,
  };
}

function mapSummarySection(block: BrandNarrativeBlockDraft, locale: string) {
  const copy = pickLocaleCopy(block.locales, locale);
  const eyebrow = text(copy.smallTitle);
  const title = text(copy.largeTitle, eyebrow);
  const body = text(copy.description, title);
  const grid = block.layout === 'multi-2' ? 'grid-2' : 'grid-3';

  if (block.id === 'patents') {
    return {
      type: 'patent-grid',
      id: block.id,
      eyebrow: eyebrow || title,
      title: title || eyebrow || ' ',
      lead: body || ' ',
      items: (block.items ?? []).map((item) => {
        const itemCopy = pickLocaleCopy(item.locales, locale);
        return {
          patentId: text(itemCopy.smallTitle, ' '),
          title: text(itemCopy.largeTitle, text(itemCopy.smallTitle, ' ')),
          body: text(itemCopy.description, ' '),
          tags: [] as string[],
        };
      }),
    };
  }

  if (block.id === 'certs') {
    return {
      type: 'header-grid',
      id: block.id,
      background: blockBackground(block),
      grid,
      eyebrow: eyebrow || title,
      title: title || eyebrow || ' ',
      lead: body || undefined,
      cards: (block.items ?? []).map((item) => {
        const itemCopy = pickLocaleCopy(item.locales, locale);
        return {
          cardStyle: 'cert' as const,
          icon: isSummaryIcon(item.icon) ? item.icon : 'check',
          title: text(itemCopy.largeTitle, text(itemCopy.smallTitle, ' ')),
          body: text(itemCopy.description, ' '),
        };
      }),
    };
  }

  if (block.id === 'innovation' || summaryItemUsesCoverImage(block)) {
    return {
      type: 'header-grid',
      id: block.id,
      grid,
      eyebrow: eyebrow || title,
      title: title || eyebrow || ' ',
      lead: body || undefined,
      cards: (block.items ?? []).map((item) => {
        const itemCopy = pickLocaleCopy(item.locales, locale);
        return {
          cardStyle: 'innovation' as const,
          year: text(itemCopy.smallTitle),
          title: text(itemCopy.largeTitle, text(itemCopy.smallTitle)),
          body: text(itemCopy.description),
          image: item.coverImage?.trim() ?? '',
          imageAlt: text(itemCopy.largeTitle),
        };
      }),
    };
  }

  if (block.id === 'outlook') {
    return {
      type: 'header-grid',
      id: block.id,
      background: blockBackground(block),
      grid,
      eyebrow: eyebrow || title,
      title: title || eyebrow || ' ',
      lead: body || undefined,
      cards: (block.items ?? []).map((item) => {
        const itemCopy = pickLocaleCopy(item.locales, locale);
        return {
          cardStyle: 'outlook' as const,
          year: text(itemCopy.smallTitle, ' '),
          title: text(itemCopy.largeTitle, text(itemCopy.smallTitle, ' ')),
          body: text(itemCopy.description, ' '),
        };
      }),
    };
  }

  const cards = (block.items ?? []).map((item) => {
    const itemCopy = pickLocaleCopy(item.locales, locale);
    const icon = isSummaryIcon(item.icon) ? item.icon : 'layers';
    return {
      cardStyle: 'value' as const,
      icon,
      title: text(itemCopy.largeTitle, text(itemCopy.smallTitle, ' ')),
      body: text(itemCopy.description, ' '),
    };
  });

  return {
    type: 'header-grid',
    id: block.id,
    background: blockBackground(block),
    grid,
    eyebrow: eyebrow || title,
    title: title || eyebrow || ' ',
    lead: body || undefined,
    cards: cards.length
      ? cards
      : [{ cardStyle: 'value' as const, icon: 'layers' as const, title: title || ' ', body: body || ' ' }],
  };
}

function mapTimelineSection(block: BrandNarrativeBlockDraft, locale: string) {
  const copy = pickLocaleCopy(block.locales, locale);
  const eyebrow = text(copy.smallTitle);
  const title = text(copy.largeTitle, eyebrow);
  const body = text(copy.description);

  return {
    type: 'timeline',
    id: block.id,
    background: blockBackground(block),
    eyebrow: eyebrow || title,
    title: title || eyebrow || ' ',
    lead: body,
    items: (block.items ?? []).map((item) => {
      const itemCopy = pickLocaleCopy(item.locales, locale);
      return {
        year: text(itemCopy.smallTitle, ' '),
        title: text(itemCopy.largeTitle, text(itemCopy.smallTitle, ' ')),
        body: text(itemCopy.description, ' '),
        image: item.coverImage?.trim() || undefined,
        imageAlt: text(itemCopy.largeTitle) || undefined,
        tags: [] as string[],
      };
    }),
  };
}

function mapCourseSection(block: BrandNarrativeBlockDraft, locale: string) {
  const copy = pickLocaleCopy(block.locales, locale);
  const eyebrow = text(copy.smallTitle);
  const title = text(copy.largeTitle, eyebrow);
  const body = text(copy.description);

  return {
    type: 'course',
    id: block.id,
    eyebrow: eyebrow || title,
    title: title || eyebrow || ' ',
    lead: body || undefined,
    courses: (block.items ?? []).map((item) => {
      const itemCopy = pickLocaleCopy(item.locales, locale);
      const kicker = text(itemCopy.smallTitle);
      const courseTitle = text(itemCopy.largeTitle, kicker);
      return {
        badge: text(itemCopy.badge),
        kicker: kicker && kicker !== courseTitle ? kicker : '',
        title: courseTitle || ' ',
        description: text(itemCopy.description),
        image: item.coverImage?.trim() ?? '',
        meta: [text(itemCopy.totalHours), text(itemCopy.teachingFormat), text(itemCopy.trainingCycle)].filter(Boolean),
      };
    }),
  };
}

function mapBlocksToSections(blocks: BrandNarrativeBlockDraft[], locale: string, slug = '') {
  const sections: Array<Record<string, unknown>> = [];

  for (const block of blocks) {
    const copy = pickLocaleCopy(block.locales, locale);

    if (block.type === 'split') {
      sections.push(mapSplitSection(block, copy, slug));
      continue;
    }

    if (block.type === 'summary') {
      if (block.id !== 'patents' && block.items?.some((item) => isPatentId(text(pickLocaleCopy(item.locales, locale).smallTitle)))) {
        sections.push({
          type: 'patent-grid',
          id: block.id,
          eyebrow: text(copy.smallTitle) || text(copy.largeTitle),
          title: text(copy.largeTitle, text(copy.smallTitle, ' ')),
          lead: text(copy.description, ' '),
          items: (block.items ?? []).map((item) => {
            const itemCopy = pickLocaleCopy(item.locales, locale);
            return {
              patentId: text(itemCopy.smallTitle, ' '),
              title: text(itemCopy.largeTitle, text(itemCopy.smallTitle, ' ')),
              body: text(itemCopy.description, ' '),
              tags: [] as string[],
            };
          }),
        });
      } else {
        sections.push(mapSummarySection(block, locale));
      }
      continue;
    }

    if (block.type === 'timeline') {
      sections.push(mapTimelineSection(block, locale));
      continue;
    }

    if (block.type === 'course') {
      sections.push(mapCourseSection(block, locale));
      continue;
    }

    if (block.type === 'cta') {
      const eyebrow = text(copy.smallTitle);
      const title = text(copy.largeTitle, eyebrow);
      const body = text(copy.description, title);
      sections.push({
        type: 'cta',
        id: block.id,
        eyebrow: eyebrow || title,
        title: title || eyebrow || ' ',
        lead: body || ' ',
        href: text(block.href, '/contact'),
        buttonLabel: text(copy.buttonLabel, '了解更多'),
      });
    }
  }

  return sections;
}

function mapPageData(
  row: typeof brandNarratives.$inferSelect,
  translation: typeof brandNarrativeTranslations.$inferSelect,
  blocks: BrandNarrativeBlockDraft[],
  requestedLocale: string,
): BrandNarrativePageData {
  const meta = resolveNarrativePageMeta(row.slug);
  const pageTitle = text(translation.title);
  const headline = text(translation.largeTitle, pageTitle);
  const stats = (translation.stats ?? []).filter((item) => item.label.trim() && item.value.trim());
  const sectionLocale = requestedLocale.trim() || translation.locale;

  return {
    slug: row.slug,
    locale: translation.locale,
    seo: {
      title: text(translation.seoTitle, pageTitle),
      description: text(translation.seoDescription, text(translation.description, pageTitle)),
    },
    breadcrumbs: [{ label: '首页', href: '/' }, { label: pageTitle }],
    hero: {
      eyebrow: pageTitle,
      title: headline,
      lead: text(translation.description),
      image: text(row.coverImage),
      imageAlt: headline,
    },
    stats: stats.length ? stats.map((item) => ({ label: item.label, value: item.value })) : null,
    sections: mapBlocksToSections(blocks, sectionLocale, row.slug),
  };
}

export async function getStorefrontBrandNarrativeBySlug(
  slug: string,
  requestedLocale: string,
): Promise<BrandNarrativePageData | null> {
  const normalizedSlug = slug.trim().toLowerCase();
  if (!normalizedSlug) return null;

  const [row] = await db
    .select()
    .from(brandNarratives)
    .where(and(eq(brandNarratives.slug, normalizedSlug), eq(brandNarratives.status, 'published')))
    .limit(1);

  if (!row) return null;

  const [translations, contentRow] = await Promise.all([
    db
      .select()
      .from(brandNarrativeTranslations)
      .where(eq(brandNarrativeTranslations.narrativeId, row.id))
      .orderBy(asc(brandNarrativeTranslations.locale)),
    db
      .select()
      .from(brandNarrativeContents)
      .where(eq(brandNarrativeContents.narrativeId, row.id))
      .limit(1),
  ]);

  if (!translations.length) return null;

  const blocks = ((contentRow[0]?.blocks ?? []) as BrandNarrativeBlockDraft[]);

  const normalized = requestedLocale.trim().toLowerCase();
  const exact = translations.find((item) => item.locale.toLowerCase() === normalized);
  if (exact) return mapPageData(row, exact, blocks, requestedLocale);

  const prefix = normalized.split('-')[0];
  const prefixMatch = translations.find((item) => {
    const locale = item.locale.toLowerCase();
    return locale === prefix || locale.startsWith(`${prefix}-`);
  });
  if (prefixMatch) return mapPageData(row, prefixMatch, blocks, requestedLocale);

  const defaultLocale = await getDefaultSiteLanguageCode();
  const fallback = pickTranslationForDisplay(translations, defaultLocale);
  if (!fallback) return null;

  return mapPageData(row, fallback, blocks, requestedLocale);
}

export async function listPublishedBrandNarrativeSlugs() {
  const rows = await db
    .select({ slug: brandNarratives.slug })
    .from(brandNarratives)
    .where(eq(brandNarratives.status, 'published'))
    .orderBy(asc(brandNarratives.sortOrder));

  return rows.map((row) => row.slug);
}

export async function getBrandNarrativeLocalesBySlug(slug: string) {
  const normalizedSlug = slug.trim().toLowerCase();
  if (!normalizedSlug) return [];

  const [row] = await db.select().from(brandNarratives).where(eq(brandNarratives.slug, normalizedSlug)).limit(1);
  if (!row) return [];

  const translations = await db
    .select({ locale: brandNarrativeTranslations.locale })
    .from(brandNarrativeTranslations)
    .where(eq(brandNarrativeTranslations.narrativeId, row.id));

  return translations.map((item) => item.locale);
}

export async function resolveBrandNarrativeCanonicalPath(pathname: string): Promise<string | null> {
  const normalized = pathname.endsWith('/') && pathname.length > 1 ? pathname.slice(0, -1) : pathname;
  if (!normalized.startsWith('/') || normalized === '/') return null;

  const slug = normalized.replace(/^\//, '');
  const [row] = await db
    .select({ slug: brandNarratives.slug })
    .from(brandNarratives)
    .where(and(eq(brandNarratives.slug, slug), eq(brandNarratives.status, 'published')))
    .limit(1);

  return row ? `/${row.slug}` : null;
}
