import { inArray } from 'drizzle-orm';

import type { BrandNarrativeBlockDraft, BrandNarrativeBlockItemDraft } from '@/lib/brand-narrative-blocks';
import {
  createBrandNarrativeBlockId,
  createBrandNarrativeBlockItemId,
  createBrandNarrativeCarouselSlide,
  defaultBrandNarrativeSummaryIcon,
  isSummaryIcon,
} from '@/lib/brand-narrative-blocks';
import { BRAND_NARRATIVE_META, type BrandNarrativeSeedSlug } from '@/lib/brand-narrative-content';
import {
  type BrandNarrativeLegacyPayload,
  brandNarrativeSeedRecords,
} from '@/server/db/brand-narrative-seed-data';
import { db } from '@/server/db';
import { brandNarrativeContents, brandNarrativeTranslations, brandNarratives } from '@/server/db/schema';

const SEED_SLUGS = ['about', 'patents', 'history', 'training'] as const;

function localeCopyFrom(values: {
  smallTitle?: string;
  largeTitle?: string;
  description?: string;
  buttonLabel?: string;
  badge?: string;
  totalHours?: string;
  teachingFormat?: string;
  trainingCycle?: string;
}) {
  return {
    smallTitle: values.smallTitle ?? '',
    largeTitle: values.largeTitle ?? '',
    description: values.description ?? '',
    buttonLabel: values.buttonLabel ?? '',
    badge: values.badge ?? '',
    totalHours: values.totalHours ?? '',
    teachingFormat: values.teachingFormat ?? '',
    trainingCycle: values.trainingCycle ?? '',
  };
}

function fillLocales(
  locales: string[],
  copy: {
    smallTitle?: string;
    largeTitle?: string;
    description?: string;
    buttonLabel?: string;
    badge?: string;
    totalHours?: string;
    teachingFormat?: string;
    trainingCycle?: string;
  },
) {
  return Object.fromEntries(locales.map((locale) => [locale, localeCopyFrom(copy)]));
}

function sectionsToBlocks(sections: BrandNarrativeLegacyPayload['sections'], locales: string[]): BrandNarrativeBlockDraft[] {
  const blocks: BrandNarrativeBlockDraft[] = [];

  for (const section of sections) {
    if (section.type === 'split-content') {
      const image = typeof section.image === 'string' ? section.image : '';
      blocks.push({
        id: typeof section.id === 'string' ? section.id : createBrandNarrativeBlockId(),
        type: 'split',
        layout: section.imagePosition === 'right' ? 'image-right' : 'image-left',
        carouselFitMode: 'contain-center',
        carouselImages: image ? [createBrandNarrativeCarouselSlide(image)] : [],
        locales: fillLocales(locales, {
          smallTitle: String(section.eyebrow ?? ''),
          largeTitle: String(section.title ?? ''),
          description: String(section.body ?? ''),
        }),
        items: [],
      });
      continue;
    }

    if (section.type === 'header-grid') {
      const cards = Array.isArray(section.cards) ? section.cards as Array<Record<string, unknown>> : [];
      const items: BrandNarrativeBlockItemDraft[] = cards.map((card) => {
        const cardStyle = typeof card.cardStyle === 'string' ? card.cardStyle : 'value';
        const iconValue = typeof card.icon === 'string' && isSummaryIcon(card.icon) ? card.icon : defaultBrandNarrativeSummaryIcon;
        const item: BrandNarrativeBlockItemDraft = {
          id: createBrandNarrativeBlockItemId(),
          icon: cardStyle === 'value' ? iconValue : undefined,
          coverImage: typeof card.image === 'string' ? card.image : '',
          locales: fillLocales(locales, {
            smallTitle: typeof card.year === 'string' ? card.year : '',
            largeTitle: String(card.title ?? ''),
            description: String(card.body ?? ''),
          }),
        };
        return item;
      });
      blocks.push({
        id: typeof section.id === 'string' ? section.id : createBrandNarrativeBlockId(),
        type: 'summary',
        layout: section.grid === 'grid-2' ? 'multi-2' : section.grid === 'grid-3' ? 'multi-3' : 'single-row',
        locales: fillLocales(locales, {
          smallTitle: String(section.eyebrow ?? ''),
          largeTitle: String(section.title ?? ''),
          description: String(section.lead ?? ''),
        }),
        items,
      });
      continue;
    }

    if (section.type === 'timeline') {
      const rawItems = Array.isArray(section.items) ? section.items as Array<Record<string, unknown>> : [];
      blocks.push({
        id: typeof section.id === 'string' ? section.id : createBrandNarrativeBlockId(),
        type: 'timeline',
        locales: fillLocales(locales, {
          smallTitle: String(section.eyebrow ?? ''),
          largeTitle: String(section.title ?? ''),
          description: String(section.lead ?? ''),
        }),
        items: rawItems.map((item) => ({
          id: createBrandNarrativeBlockItemId(),
          coverImage: typeof item.image === 'string' ? item.image : '',
          locales: fillLocales(locales, {
            smallTitle: String(item.year ?? ''),
            largeTitle: String(item.title ?? ''),
            description: String(item.body ?? ''),
          }),
        })),
      });
      continue;
    }

    if (section.type === 'patent-grid') {
      const rawItems = Array.isArray(section.items) ? section.items as Array<Record<string, unknown>> : [];
      blocks.push({
        id: typeof section.id === 'string' ? section.id : createBrandNarrativeBlockId(),
        type: 'summary',
        layout: 'multi-3',
        locales: fillLocales(locales, {
          smallTitle: String(section.eyebrow ?? ''),
          largeTitle: String(section.title ?? ''),
          description: String(section.lead ?? ''),
        }),
        items: rawItems.map((item) => ({
          id: createBrandNarrativeBlockItemId(),
          locales: fillLocales(locales, {
            smallTitle: String(item.patentId ?? ''),
            largeTitle: String(item.title ?? ''),
            description: String(item.body ?? ''),
          }),
        })),
      });
      continue;
    }

    if (section.type === 'course') {
      const courses = Array.isArray(section.courses) ? section.courses as Array<Record<string, unknown>> : [];
      blocks.push({
        id: typeof section.id === 'string' ? section.id : createBrandNarrativeBlockId(),
        type: 'course',
        locales: fillLocales(locales, {
          smallTitle: String(section.eyebrow ?? ''),
          largeTitle: String(section.title ?? ''),
          description: String(section.lead ?? ''),
        }),
        items: courses.map((item) => ({
          id: createBrandNarrativeBlockItemId(),
          coverImage: typeof item.image === 'string' ? item.image : '',
          locales: fillLocales(locales, {
            smallTitle: typeof item.smallTitle === 'string' ? item.smallTitle : '',
            largeTitle: String(item.title ?? ''),
            description: String(item.description ?? ''),
            badge: String(item.badge ?? ''),
            totalHours: String(item.totalHours ?? ''),
            teachingFormat: String(item.teachingFormat ?? ''),
            trainingCycle: String(item.trainingCycle ?? ''),
          }),
        })),
      });
      continue;
    }

    if (section.type === 'cta') {
      blocks.push({
        id: typeof section.id === 'string' ? section.id : createBrandNarrativeBlockId(),
        type: 'cta',
        href: typeof section.href === 'string' ? section.href : '/contact',
        locales: fillLocales(locales, {
          smallTitle: String(section.eyebrow ?? ''),
          largeTitle: String(section.title ?? ''),
          description: String(section.lead ?? ''),
          buttonLabel: String(section.buttonLabel ?? ''),
        }),
        items: [],
      });
    }
  }

  return blocks;
}

export async function purgeBrandNarratives(slugs: string[] = [...SEED_SLUGS]) {
  const targets = [...new Set(slugs.includes('training') ? [...slugs, 'training1'] : slugs)];
  const deleted = await db
    .delete(brandNarratives)
    .where(inArray(brandNarratives.slug, targets))
    .returning({ slug: brandNarratives.slug });
  console.log(`Purged brand narratives: ${deleted.map((row) => row.slug).join(', ') || '(none)'}`);
}

export async function seedBrandNarratives(options?: {
  purge?: boolean;
  slugs?: BrandNarrativeSeedSlug[];
}) {
  const slugs = options?.slugs ?? [...SEED_SLUGS];
  if (options?.purge !== false) {
    await purgeBrandNarratives(slugs);
  }

  for (const record of brandNarrativeSeedRecords.filter((item) => slugs.includes(item.slug))) {
    const meta = BRAND_NARRATIVE_META[record.slug];
    const locales = record.translations.map((item) => item.locale);
    const zhPayload = record.translations.find((item) => item.locale === 'zh-CN' || item.locale === 'zh')?.payload
      ?? record.translations[0].payload;
    const blocks = sectionsToBlocks(zhPayload.sections, locales);

    // 封面图取第一条翻译（通常是中文）的 hero.image，存到主表
    const coverImage = zhPayload.hero.image ?? '';

    const [inserted] = await db
      .insert(brandNarratives)
      .values({
        slug: record.slug,
        sortOrder: meta.sortOrder,
        status: 'published',
        publishedAt: new Date(),
        coverImage,
      })
      .returning({ id: brandNarratives.id });

    console.log(`Created brand narrative: ${record.slug}`);

    // 内容区块单独存一行
    await db.insert(brandNarrativeContents).values({
      narrativeId: inserted.id,
      blocks,
    });

    // 多语言看板字段
    for (const translation of record.translations) {
      const legacy = translation.payload;
      const stats = (legacy.stats ?? []).map((stat) => ({
        label: stat.label,
        value: `${stat.value}${stat.suffix ?? ''}`,
      }));

      await db.insert(brandNarrativeTranslations).values({
        narrativeId: inserted.id,
        locale: translation.locale,
        title: legacy.hero.eyebrow?.trim() || translation.title,
        largeTitle: legacy.hero.title ?? '',
        description: legacy.hero.lead ?? '',
        seoTitle: '',
        seoDescription: '',
        stats,
      });
      console.log(`  Created translation ${record.slug}/${translation.locale}`);
    }
  }

  console.log('Brand narrative seed completed.');
}
