import 'server-only';

import { eq } from 'drizzle-orm';

import { pickTranslationForDisplay } from '@/lib/pick-translation-for-display';
import { getDefaultSiteLanguageCode } from '@/server/admin/site-locale';
import { db } from '@/server/db';
import { productCoverageBoards, productCoverageBoardTranslations } from '@/server/db/schema';
import { getProductList } from '@/server/storefront/catalog';
import type { ProductListSort } from '@/server/storefront/types';

export async function resolveStorefrontProductBoard(boardKeyInput: string) {
  const boardKey = boardKeyInput.trim();
  if (!boardKey) return null;

  const [row] = await db
    .select()
    .from(productCoverageBoards)
    .where(eq(productCoverageBoards.boardKey, boardKey))
    .limit(1);

  if (!row || !row.enabled) return null;

  const locale = await getDefaultSiteLanguageCode();
  const translations = await db
    .select()
    .from(productCoverageBoardTranslations)
    .where(eq(productCoverageBoardTranslations.boardId, row.id));

  const display = pickTranslationForDisplay(translations, locale);
  return {
    key: row.boardKey,
    title: display?.name?.trim() || row.boardKey,
    enabled: row.enabled,
  };
}

export function defaultSortForProductBoard(boardKey: string): ProductListSort {
  if (boardKey === 'newest') return 'newest';
  return 'featured';
}

export async function getProductListByBoard(
  boardKeyInput: string,
  input: {
    page?: number;
    pageSize?: number;
    sort?: ProductListSort;
    purchaseMode?: 'buy' | 'inquiry';
    inStockOnly?: boolean;
    locale?: string | null;
  },
) {
  const board = await resolveStorefrontProductBoard(boardKeyInput);
  if (!board) return null;

  const result = await getProductList({
    productBoardKey: board.key,
    page: input.page,
    pageSize: input.pageSize,
    sort: input.sort ?? defaultSortForProductBoard(board.key),
    purchaseMode: input.purchaseMode,
    inStockOnly: input.inStockOnly,
    locale: input.locale,
  });

  return {
    boardKey: board.key,
    boardTitle: board.title,
    ...result,
  };
}
