/**
 * Convert legacy coverValue/backgroundValue (media_assets UUID) to R2 storage keys.
 * Run: pnpm exec tsx scripts/migrate-upload-values-to-storage-keys.ts --apply
 */
import '@/lib/env';

import { eq, inArray } from 'drizzle-orm';

import { UPLOAD_VALUE_UUID_RE } from '@/lib/upload-storage-key';
import { db } from '@/server/db';
import {
  brandNarrativeContents,
  brandNarratives,
  editorialContents,
  mediaAssets,
  partnerCenters,
  products,
  solutionContents,
  solutions,
  summits,
} from '@/server/db/schema';

const APPLY = process.argv.includes('--apply');

type FieldTarget = {
  table: string;
  id: string;
  field: 'coverValue' | 'backgroundValue';
  value: string;
  legacyImage: string;
};

async function loadUuidMap(values: string[]) {
  const uuids = [...new Set(values.filter((v) => UPLOAD_VALUE_UUID_RE.test(v)))];
  if (!uuids.length) return new Map<string, string>();
  const rows = await db
    .select({ id: mediaAssets.id, storageKey: mediaAssets.storageKey })
    .from(mediaAssets)
    .where(inArray(mediaAssets.id, uuids));
  return new Map(rows.map((row) => [row.id, row.storageKey]));
}

function collectFromRows<T extends { id: string; coverMode?: string | null; coverValue?: string | null; coverImage?: string | null; backgroundMode?: string | null; backgroundValue?: string | null; backgroundImage?: string | null }>(
  table: string,
  rows: T[],
): FieldTarget[] {
  const targets: FieldTarget[] = [];
  for (const row of rows) {
    if (row.coverMode === 'upload' && row.coverValue && UPLOAD_VALUE_UUID_RE.test(row.coverValue)) {
      targets.push({
        table,
        id: row.id,
        field: 'coverValue',
        value: row.coverValue,
        legacyImage: row.coverImage?.trim() ?? '',
      });
    }
    if (row.backgroundMode === 'upload' && row.backgroundValue && UPLOAD_VALUE_UUID_RE.test(row.backgroundValue)) {
      targets.push({
        table,
        id: row.id,
        field: 'backgroundValue',
        value: row.backgroundValue,
        legacyImage: row.backgroundImage?.trim() ?? '',
      });
    }
  }
  return targets;
}

async function main() {
  const targets: FieldTarget[] = [
    ...collectFromRows('summits', await db.select().from(summits)),
    ...collectFromRows('partner_centers', await db.select().from(partnerCenters)),
    ...collectFromRows('solutions', await db.select().from(solutions)),
    ...collectFromRows('brand_narratives', await db.select().from(brandNarratives)),
    ...collectFromRows('products', await db.select().from(products)),
    ...collectFromRows('editorial_contents', await db.select().from(editorialContents)),
  ];

  const keyByUuid = await loadUuidMap(targets.map((t) => t.value));

  let updated = 0;
  for (const target of targets) {
    const storageKey = keyByUuid.get(target.value) ?? target.legacyImage;
    if (!storageKey) {
      console.warn(`跳过（无 storage key）: ${target.table} ${target.id} ${target.field}=${target.value}`);
      continue;
    }
    console.log(`${APPLY ? '更新' : '[dry-run]'} ${target.table}.${target.field}: ${target.value} → ${storageKey}`);
    if (!APPLY) {
      updated += 1;
      continue;
    }

    const patch =
      target.field === 'coverValue'
        ? { coverValue: storageKey, coverImage: storageKey }
        : { backgroundValue: storageKey, backgroundImage: storageKey };

    if (target.table === 'summits') {
      await db.update(summits).set(patch).where(eq(summits.id, target.id));
    } else if (target.table === 'partner_centers') {
      await db.update(partnerCenters).set(patch).where(eq(partnerCenters.id, target.id));
    } else if (target.table === 'solutions') {
      await db.update(solutions).set(patch).where(eq(solutions.id, target.id));
    } else if (target.table === 'brand_narratives') {
      await db.update(brandNarratives).set(patch).where(eq(brandNarratives.id, target.id));
    } else if (target.table === 'products') {
      await db.update(products).set(patch).where(eq(products.id, target.id));
    } else if (target.table === 'editorial_contents') {
      await db.update(editorialContents).set(patch).where(eq(editorialContents.id, target.id));
    }
    updated += 1;
  }

  console.log(`\n${APPLY ? '已' : '将'}迁移 ${updated} 条 upload 字段`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
