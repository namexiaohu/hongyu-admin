/**
 * One-shot: import published solutions into homepage_configs_i18n.solutions_items.
 *
 * Source matches current home page: published solutions, sort=createdAt (asc), first 4.
 * For each homepage locale row, maps that locale's solution copy.
 * coverImage stored as OSS key (resolved on storefront); href = /solutions/{slug}.
 *
 * Usage:
 *   pnpm exec tsx scripts/import-homepage-solution-items.ts
 *   pnpm exec tsx scripts/import-homepage-solution-items.ts --dry-run
 *
 * Re-runnable: overwrites solutions_items on every homepage translation row.
 */
import '@/lib/env';

import { asc, eq } from 'drizzle-orm';

import { resolveStorefrontCoverUrl } from '@/lib/cover-presets';
import type { HomepageSolutionItem } from '@/lib/homepage-config';
import { resolveOssAssetUrl, toOssStorageKey } from '@/lib/oss-asset-url';
import { db } from '@/server/db';
import {
  homepageConfigTranslations,
  homepageConfigs,
  solutionTranslations,
  solutions,
} from '@/server/db/schema';

if (!db) {
  throw new Error('DATABASE_URL is required');
}

const DRY_RUN = process.argv.includes('--dry-run');
const LIMIT = 4;

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

function coverStorageKey(row: {
  coverMode: string;
  coverValue: string;
  coverImage: string;
}) {
  const publicUrl = resolveStorefrontCoverUrl({
    mode: row.coverMode,
    value: row.coverValue,
    legacyCoverImageKey: row.coverImage,
    toPublicUrl: resolveOssAssetUrl,
  }).trim();
  if (!publicUrl) return '';
  return toOssStorageKey(publicUrl) || publicUrl;
}

async function loadTranslationsBySolutionIds(ids: string[]) {
  if (!ids.length) return new Map<string, Array<typeof solutionTranslations.$inferSelect>>();
  const idSet = new Set(ids);
  const rows = await db!.select().from(solutionTranslations);
  const map = new Map<string, Array<typeof solutionTranslations.$inferSelect>>();
  for (const row of rows) {
    if (!idSet.has(row.solutionId)) continue;
    const list = map.get(row.solutionId) ?? [];
    list.push(row);
    map.set(row.solutionId, list);
  }
  return map;
}

/** Same order/limit as getStorefrontSolutionsList({ sort: 'createdAt', pageSize: 4 }). */
async function loadPublishedSolutionsOrdered() {
  const rows = await db!
    .select({
      id: solutions.id,
      slug: solutions.slug,
      createdAt: solutions.createdAt,
      coverMode: solutions.coverMode,
      coverValue: solutions.coverValue,
      coverImage: solutions.coverImage,
    })
    .from(solutions)
    .where(eq(solutions.status, 'published'))
    .orderBy(asc(solutions.createdAt), asc(solutions.slug));

  const translationsById = await loadTranslationsBySolutionIds(rows.map((row) => row.id));
  return rows.filter((row) => (translationsById.get(row.id)?.length ?? 0) > 0).slice(0, LIMIT);
}

function buildItemsForLocale(
  published: Awaited<ReturnType<typeof loadPublishedSolutionsOrdered>>,
  translationsById: Map<string, Array<typeof solutionTranslations.$inferSelect>>,
  locale: string,
): HomepageSolutionItem[] {
  const items: HomepageSolutionItem[] = [];
  for (const solution of published) {
    const translation = pickLocaleRow(translationsById.get(solution.id) ?? [], locale);
    if (!translation) continue;

    const title = (translation.largeTitle?.trim() || translation.title || '').trim();
    items.push({
      title,
      description: (translation.description || '').trim(),
      badgeText: (translation.badgeText || '').trim(),
      coverImage: coverStorageKey(solution),
      href: `/solutions/${solution.slug}`,
    });
  }
  return items;
}

async function main() {
  const [config] = await db!.select({ id: homepageConfigs.id }).from(homepageConfigs).limit(1);
  if (!config) {
    console.log('No homepage_configs row; nothing to import.');
    return;
  }

  const localeRows = await db!
    .select({
      id: homepageConfigTranslations.id,
      locale: homepageConfigTranslations.locale,
    })
    .from(homepageConfigTranslations)
    .where(eq(homepageConfigTranslations.configId, config.id));

  if (!localeRows.length) {
    console.log('No homepage_configs_i18n rows; nothing to import.');
    return;
  }

  const published = await loadPublishedSolutionsOrdered();
  const translationsById = await loadTranslationsBySolutionIds(published.map((row) => row.id));

  console.log(
    `Homepage config ${config.id}; ${localeRows.length} locale(s); `
    + `${published.length} published solution(s) (createdAt asc, limit ${LIMIT}); dryRun=${DRY_RUN}`,
  );

  for (const row of localeRows) {
    const solutionItems = buildItemsForLocale(published, translationsById, row.locale);
    console.log(
      `[${row.locale}] ${solutionItems.length} item(s):`,
      solutionItems.map((item) => item.title || item.href).join(' | ') || '(empty)',
    );

    if (DRY_RUN) continue;

    await db!
      .update(homepageConfigTranslations)
      .set({
        solutionItems,
        updatedAt: new Date(),
      })
      .where(eq(homepageConfigTranslations.id, row.id));
  }

  console.log(DRY_RUN ? 'Dry run done (no writes).' : 'Import done.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
