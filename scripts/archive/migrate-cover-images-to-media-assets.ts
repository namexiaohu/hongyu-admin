/**
 * @deprecated Superseded by migrate-upload-values-to-storage-keys.ts
 * Old migration wrote media_assets.id into coverValue — entities should store R2 keys instead.
 */
import '@/lib/env';

import { and, eq } from 'drizzle-orm';

import { MEDIA_ASSET_TYPE_COVER } from '@/lib/media-assets';
import { toOssStorageKey } from '@/lib/oss-asset-url';
import { defaultProductPayload, type AdminProductPayload } from '@/lib/product-content';
import { db } from '@/server/db';
import {
  brandNarrativeContents,
  brandNarratives,
  editorialContents,
  mediaAssets,
  partnerCenters,
  products,
  productTranslations,
  solutionContents,
  solutions,
  summits,
} from '@/server/db/schema';

const APPLY = process.argv.includes('--apply');

type CoverTarget = {
  source: string;
  id: string;
  storageKey: string;
};

function normalizeKey(raw: string | null | undefined): string {
  const trimmed = raw?.trim() ?? '';
  if (!trimmed) return '';
  return toOssStorageKey(trimmed) || trimmed;
}

async function ensureCoverAsset(storageKey: string, cache: Map<string, string>): Promise<string> {
  const cached = cache.get(storageKey);
  if (cached) return cached;

  const [existing] = await db
    .select({ id: mediaAssets.id })
    .from(mediaAssets)
    .where(and(eq(mediaAssets.storageKey, storageKey), eq(mediaAssets.type, MEDIA_ASSET_TYPE_COVER)))
    .limit(1);

  if (existing) {
    cache.set(storageKey, existing.id);
    return existing.id;
  }

  if (!APPLY) {
    const placeholder = `dry-run:${storageKey}`;
    cache.set(storageKey, placeholder);
    return placeholder;
  }

  const [created] = await db
    .insert(mediaAssets)
    .values({
      type: MEDIA_ASSET_TYPE_COVER,
      storageKey,
      filename: storageKey.split('/').pop() || 'cover',
      contentType: 'image/jpeg',
      byteSize: 0,
    })
    .returning({ id: mediaAssets.id });

  if (!created) throw new Error(`Failed to create media asset for ${storageKey}`);
  cache.set(storageKey, created.id);
  return created.id;
}

async function collectEntityCovers(): Promise<CoverTarget[]> {
  const targets: CoverTarget[] = [];

  const tables = [
    { name: 'partner_centers', rows: await db.select({ id: partnerCenters.id, coverImage: partnerCenters.coverImage, coverMode: partnerCenters.coverMode }).from(partnerCenters) },
    { name: 'brand_narratives', rows: await db.select({ id: brandNarratives.id, coverImage: brandNarratives.coverImage, coverMode: brandNarratives.coverMode }).from(brandNarratives) },
    { name: 'solutions', rows: await db.select({ id: solutions.id, coverImage: solutions.coverImage, coverMode: solutions.coverMode }).from(solutions) },
    { name: 'summits', rows: await db.select({ id: summits.id, coverImage: summits.coverImage, coverMode: summits.coverMode }).from(summits) },
    { name: 'editorial_contents', rows: await db.select({ id: editorialContents.id, coverImage: editorialContents.coverImage, coverMode: editorialContents.coverMode }).from(editorialContents) },
  ] as const;

  for (const table of tables) {
    for (const row of table.rows) {
      if (row.coverMode === 'upload' || row.coverMode === 'preset') continue;
      const key = normalizeKey(row.coverImage);
      if (!key) continue;
      targets.push({ source: table.name, id: row.id, storageKey: key });
    }
  }

  return targets;
}

async function collectProductCovers(): Promise<Array<CoverTarget & { coverUrlByLocale: Map<string, string> }>> {
  const productRows = await db
    .select({
      id: products.id,
      coverImage: products.coverImage,
      coverMode: products.coverMode,
    })
    .from(products);

  const translations = await db
    .select({
      productId: productTranslations.productId,
      locale: productTranslations.locale,
      payload: productTranslations.payload,
    })
    .from(productTranslations);

  const payloadByProduct = new Map<string, Map<string, string>>();
  for (const t of translations) {
    const payload = (t.payload ?? {}) as AdminProductPayload;
    const key = normalizeKey(payload.coverUrl ?? '');
    if (!key) continue;
    const bucket = payloadByProduct.get(t.productId) ?? new Map();
    bucket.set(t.locale, key);
    payloadByProduct.set(t.productId, bucket);
  }

  const targets: Array<CoverTarget & { coverUrlByLocale: Map<string, string> }> = [];
  for (const row of productRows) {
    if (row.coverMode === 'upload' || row.coverMode === 'preset') continue;
    const locales = payloadByProduct.get(row.id) ?? new Map();
    const fromProduct = normalizeKey(row.coverImage);
    const fromPayload = [...locales.values()][0] ?? '';
    const key = fromProduct || fromPayload;
    if (!key) continue;
    targets.push({
      source: 'products',
      id: row.id,
      storageKey: key,
      coverUrlByLocale: locales,
    });
  }
  return targets;
}

type BlockItem = {
  coverMode?: string;
  coverValue?: string;
  coverImage?: string;
  [key: string]: unknown;
};

type BlockRow = {
  items?: BlockItem[];
  [key: string]: unknown;
};

async function migrateBlockContents(
  label: string,
  rows: Array<{ id: string; blocks: unknown }>,
  update: (id: string, blocks: BlockRow[]) => Promise<void>,
  cache: Map<string, string>,
) {
  let updated = 0;
  let itemCount = 0;

  for (const row of rows) {
    const blocks = (Array.isArray(row.blocks) ? row.blocks : []) as BlockRow[];
    let changed = false;
    const nextBlocks = [];

    for (const block of blocks) {
      const items = Array.isArray(block.items) ? block.items : [];
      const nextItems = [];
      for (const item of items) {
        if (item.coverMode === 'upload' || item.coverMode === 'preset') {
          nextItems.push(item);
          continue;
        }
        const key = normalizeKey(item.coverImage);
        if (!key) {
          nextItems.push(item);
          continue;
        }
        const assetId = await ensureCoverAsset(key, cache);
        itemCount += 1;
        changed = true;
        nextItems.push({
          ...item,
          coverMode: 'upload',
          coverValue: assetId,
          coverImage: key,
        });
      }
      nextBlocks.push({ ...block, items: nextItems });
    }

    if (!changed) continue;
    console.log(`  ${label} content ${row.id}: migrated block item covers`);
    if (APPLY) await update(row.id, nextBlocks);
    updated += 1;
  }

  return { updated, itemCount };
}

async function main() {
  console.log(`封面图选项化迁移；模式: ${APPLY ? 'APPLY' : 'DRY-RUN'}`);
  const cache = new Map<string, string>();

  // Warm cache with existing cover assets
  const existingCovers = await db
    .select({ id: mediaAssets.id, storageKey: mediaAssets.storageKey })
    .from(mediaAssets)
    .where(eq(mediaAssets.type, MEDIA_ASSET_TYPE_COVER));
  for (const row of existingCovers) {
    cache.set(row.storageKey, row.id);
  }

  const entityTargets = await collectEntityCovers();
  console.log(`\n实体封面待迁移: ${entityTargets.length}`);

  for (const target of entityTargets) {
    const assetId = await ensureCoverAsset(target.storageKey, cache);
    console.log(`  ${target.source}/${target.id}: → upload/${assetId.slice(0, 8)}… key=${target.storageKey.slice(0, 48)}`);
    if (!APPLY) continue;

    const patch = {
      coverMode: 'upload' as const,
      coverValue: assetId,
      coverImage: target.storageKey,
      updatedAt: new Date(),
    };

    if (target.source === 'partner_centers') {
      await db.update(partnerCenters).set(patch).where(eq(partnerCenters.id, target.id));
    } else if (target.source === 'brand_narratives') {
      await db.update(brandNarratives).set(patch).where(eq(brandNarratives.id, target.id));
    } else if (target.source === 'solutions') {
      await db.update(solutions).set(patch).where(eq(solutions.id, target.id));
    } else if (target.source === 'summits') {
      await db.update(summits).set(patch).where(eq(summits.id, target.id));
    } else if (target.source === 'editorial_contents') {
      await db.update(editorialContents).set(patch).where(eq(editorialContents.id, target.id));
    }
  }

  const productTargets = await collectProductCovers();
  console.log(`\n产品封面待迁移: ${productTargets.length}`);
  for (const target of productTargets) {
    const assetId = await ensureCoverAsset(target.storageKey, cache);
    console.log(`  products/${target.id}: → upload/${assetId.slice(0, 8)}…`);
    if (!APPLY) continue;

    await db
      .update(products)
      .set({
        coverMode: 'upload',
        coverValue: assetId,
        coverImage: target.storageKey,
        updatedAt: new Date(),
      })
      .where(eq(products.id, target.id));

    const translations = await db
      .select()
      .from(productTranslations)
      .where(eq(productTranslations.productId, target.id));

    for (const translation of translations) {
      const payload = {
        ...defaultProductPayload(),
        ...((translation.payload ?? {}) as AdminProductPayload),
        coverUrl: target.storageKey,
      };
      await db
        .update(productTranslations)
        .set({ payload, updatedAt: new Date() })
        .where(eq(productTranslations.id, translation.id));
    }
  }

  const narrativeContents = await db
    .select({ id: brandNarrativeContents.id, blocks: brandNarrativeContents.blocks })
    .from(brandNarrativeContents);
  const narrativeResult = await migrateBlockContents(
    'brand_narrative',
    narrativeContents,
    async (id, blocks) => {
      await db
        .update(brandNarrativeContents)
        .set({ blocks, updatedAt: new Date() })
        .where(eq(brandNarrativeContents.id, id));
    },
    cache,
  );

  const solutionContentRows = await db
    .select({ id: solutionContents.id, blocks: solutionContents.blocks })
    .from(solutionContents);
  const solutionResult = await migrateBlockContents(
    'solution',
    solutionContentRows,
    async (id, blocks) => {
      await db
        .update(solutionContents)
        .set({ blocks, updatedAt: new Date() })
        .where(eq(solutionContents.id, id));
    },
    cache,
  );

  console.log('\n汇总:');
  console.log(`  实体: ${entityTargets.length}`);
  console.log(`  产品: ${productTargets.length}`);
  console.log(`  叙事区块内容行: ${narrativeResult.updated}（子项 ${narrativeResult.itemCount}）`);
  console.log(`  方案区块内容行: ${solutionResult.updated}（子项 ${solutionResult.itemCount}）`);
  if (!APPLY) {
    console.log('\n加 --apply 执行写入。');
  } else {
    console.log('\n已写入。');
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
