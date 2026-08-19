import 'server-only';

import { count, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';

import { normalizeEntityKeyForSave } from '@/lib/admin-entity-key';
import {
  type AdminProductBoardsDashboard,
  type AdminProductCoverageBoardDetail,
  type AdminProductCoverageBoardTranslation,
  type ProductCoverageMetric,
  isSystemProductBoardKey,
  patchProductCoverageBoardSchema,
  sortProductCoverageBoards,
  upsertProductCoverageBoardSchema,
} from '@/lib/product-boards';
import { pickTranslationForDisplay } from '@/lib/pick-translation-for-display';
import { getDefaultSiteLanguageCode } from '@/server/admin/site-locale';
import { db } from '@/server/db';
import { productBoardAssignments, productCoverageBoards, productCoverageBoardTranslations } from '@/server/db/schema';

type BoardRow = typeof productCoverageBoards.$inferSelect;
type TranslationRow = typeof productCoverageBoardTranslations.$inferSelect;

const SYSTEM_BOARD_SEEDS = [
  { key: 'featured', name: '特色精选', description: '首页/专题位重点展示', sourceMode: 'code-seeded' as const },
  { key: 'newest',   name: '最新上架', description: '按上新节奏运营',       sourceMode: 'code-seeded' as const },
  { key: 'hot-sale', name: '热销',     description: '销量/转化导向',         sourceMode: 'code-seeded' as const },
];

function now() {
  return new Date();
}

function toSourceMode(value: string | null | undefined): 'code-seeded' | 'admin-managed' {
  return value === 'code-seeded' ? 'code-seeded' : 'admin-managed';
}

function toIso(value: Date | string | null | undefined) {
  if (!value) return undefined;
  if (value instanceof Date) return value.toISOString();
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? undefined : new Date(parsed).toISOString();
}

function mapTranslation(row: TranslationRow): AdminProductCoverageBoardTranslation {
  return { id: row.id, locale: row.locale, name: row.name, description: row.description };
}

async function loadTranslationMap(boardIds: string[]) {
  if (!boardIds.length) return new Map<string, TranslationRow[]>();
  const rows = await db
    .select()
    .from(productCoverageBoardTranslations)
    .where(inArray(productCoverageBoardTranslations.boardId, boardIds));

  const map = new Map<string, TranslationRow[]>();
  for (const row of rows) {
    const bucket = map.get(row.boardId) ?? [];
    bucket.push(row);
    map.set(row.boardId, bucket);
  }
  return map;
}

async function countProductsByBoardKey() {
  const rows = await db
    .select({ boardKey: productBoardAssignments.boardKey, value: count() })
    .from(productBoardAssignments)
    .groupBy(productBoardAssignments.boardKey);
  return new Map(rows.map((row) => [row.boardKey, Number(row.value ?? 0)]));
}

/** Ensure system boards exist in the DB (called on first load). */
export async function ensureSystemProductBoards() {
  const existing = await db.select({ key: productCoverageBoards.boardKey }).from(productCoverageBoards);
  const existingKeys = new Set(existing.map((row) => row.key));

  const defaultLocale = await getDefaultSiteLanguageCode();

  for (const seed of SYSTEM_BOARD_SEEDS) {
    if (existingKeys.has(seed.key)) continue;
    const [row] = await db
      .insert(productCoverageBoards)
      .values({ boardKey: seed.key, sourceMode: seed.sourceMode, enabled: true, createdAt: now(), updatedAt: now() })
      .onConflictDoNothing({ target: productCoverageBoards.boardKey })
      .returning();
    if (!row) continue;
    await db.insert(productCoverageBoardTranslations).values({
      boardId: row.id, locale: defaultLocale, name: seed.name, description: seed.description,
      createdAt: now(), updatedAt: now(),
    }).onConflictDoNothing({
      target: [productCoverageBoardTranslations.boardId, productCoverageBoardTranslations.locale],
    });
  }
}

export async function listProductCoverageBoards(): Promise<ProductCoverageMetric[]> {
  await ensureSystemProductBoards();

  const [rows, displayLocale] = await Promise.all([
    db.select().from(productCoverageBoards),
    getDefaultSiteLanguageCode(),
  ]);
  const translationMap = await loadTranslationMap(rows.map((row) => row.id));
  const productCounts = await countProductsByBoardKey();

  const metrics: ProductCoverageMetric[] = rows.map((row) => {
    const translations = translationMap.get(row.id) ?? [];
    const display = pickTranslationForDisplay(translations, displayLocale);
    return {
      key: row.boardKey,
      title: display?.name?.trim() || row.boardKey,
      note: display?.description?.trim() || '',
      sourceMode: toSourceMode(row.sourceMode),
      enabled: row.enabled !== false,
      custom: !isSystemProductBoardKey(row.boardKey),
      count: productCounts.get(row.boardKey) ?? 0,
      createdAt: toIso(row.createdAt),
    };
  });

  return sortProductCoverageBoards(metrics);
}

export async function getAdminProductBoardsDashboard(): Promise<AdminProductBoardsDashboard> {
  const coverage = await listProductCoverageBoards();
  const assignedProductIds = await db
    .selectDistinct({ productId: productBoardAssignments.productId })
    .from(productBoardAssignments);

  return {
    coverage,
    summary: {
      boardCount: coverage.length,
      customBoardCount: coverage.filter((b) => b.custom).length,
      assignedProductCount: assignedProductIds.length,
    },
  };
}

export async function getProductCoverageBoardDetail(boardKey: string): Promise<AdminProductCoverageBoardDetail | null> {
  const key = normalizeEntityKeyForSave(boardKey);
  if (!key) return null;

  const [row] = await db
    .select()
    .from(productCoverageBoards)
    .where(eq(productCoverageBoards.boardKey, key))
    .limit(1);
  if (!row) return null;

  const translations = await db
    .select()
    .from(productCoverageBoardTranslations)
    .where(eq(productCoverageBoardTranslations.boardId, row.id));

  return {
    id: row.id,
    key: row.boardKey,
    enabled: row.enabled !== false,
    custom: !isSystemProductBoardKey(row.boardKey),
    sourceMode: toSourceMode(row.sourceMode),
    createdAt: toIso(row.createdAt),
    translations: translations.map(mapTranslation),
  };
}

export async function upsertProductCoverageBoard(input: z.infer<typeof upsertProductCoverageBoardSchema>) {
  const key = normalizeEntityKeyForSave(input.key);
  if (!key) throw new Error('INVALID_KEY');

  const [existing] = await db
    .select()
    .from(productCoverageBoards)
    .where(eq(productCoverageBoards.boardKey, key))
    .limit(1);

  const timestamp = now();
  let board = existing;

  if (!board) {
    const [created] = await db
      .insert(productCoverageBoards)
      .values({ boardKey: key, sourceMode: 'admin-managed', enabled: true, createdAt: timestamp, updatedAt: timestamp })
      .returning();
    board = created;
  } else {
    const [updated] = await db
      .update(productCoverageBoards)
      .set({ updatedAt: timestamp })
      .where(eq(productCoverageBoards.id, board.id))
      .returning();
    board = updated ?? board;
  }

  if (!board) throw new Error('SAVE_FAILED');

  const existingTranslations = await db
    .select()
    .from(productCoverageBoardTranslations)
    .where(eq(productCoverageBoardTranslations.boardId, board.id));
  const translationByLocale = new Map(existingTranslations.map((row) => [row.locale, row]));

  for (const translation of input.translations) {
    const locale = translation.locale.trim();
    const name = translation.name.trim();
    const description = translation.description ?? null;
    const current = translationByLocale.get(locale);

    if (current) {
      await db
        .update(productCoverageBoardTranslations)
        .set({ name, description, updatedAt: timestamp })
        .where(eq(productCoverageBoardTranslations.id, current.id));
    } else {
      await db.insert(productCoverageBoardTranslations).values({
        boardId: board.id, locale, name, description, createdAt: timestamp, updatedAt: timestamp,
      });
    }
  }

  return getProductCoverageBoardDetail(key);
}

export async function setProductCoverageBoardEnabled(boardKey: string, enabled: boolean) {
  const key = normalizeEntityKeyForSave(boardKey);
  if (!key) return null;

  const [updated] = await db
    .update(productCoverageBoards)
    .set({ enabled, updatedAt: now() })
    .where(eq(productCoverageBoards.boardKey, key))
    .returning();

  if (!updated) return null;
  return getProductCoverageBoardDetail(key);
}

export async function deleteProductCoverageBoard(boardKey: string) {
  const key = normalizeEntityKeyForSave(boardKey);
  if (!key) return false;
  if (isSystemProductBoardKey(key)) throw new Error('SYSTEM_BOARD');

  const [assignmentRow] = await db
    .select({ productId: productBoardAssignments.productId })
    .from(productBoardAssignments)
    .where(eq(productBoardAssignments.boardKey, key))
    .limit(1);
  if (assignmentRow) throw new Error('BOARD_HAS_PRODUCTS');

  const [deleted] = await db
    .delete(productCoverageBoards)
    .where(eq(productCoverageBoards.boardKey, key))
    .returning({ id: productCoverageBoards.id });

  return Boolean(deleted);
}

export async function getEnabledProductBoardOptions(locale?: string) {
  await ensureSystemProductBoards();

  const rows = await db
    .select()
    .from(productCoverageBoards)
    .where(eq(productCoverageBoards.enabled, true));

  const displayLocale = locale ?? (await getDefaultSiteLanguageCode());
  const translationMap = await loadTranslationMap(rows.map((row) => row.id));

  return sortProductCoverageBoards(
    rows.map((row) => {
      const translations = translationMap.get(row.id) ?? [];
      const display = pickTranslationForDisplay(translations, displayLocale);
      return { key: row.boardKey, title: display?.name?.trim() || row.boardKey, createdAt: toIso(row.createdAt) };
    }),
  );
}

export async function validateProductBoardKeys(boardKeys: string[]) {
  const options = await getEnabledProductBoardOptions();
  const enabledKeys = new Set(options.map((o) => o.key));
  const normalized = [...new Set(boardKeys.map((key) => normalizeEntityKeyForSave(key) ?? '').filter(Boolean))];
  const invalid = normalized.find((key) => !enabledKeys.has(key));
  if (invalid) throw new Error('INVALID_BOARD_KEY');
  return normalized;
}

// Re-export patch schema for API routes
export { patchProductCoverageBoardSchema };
