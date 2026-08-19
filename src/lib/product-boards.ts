import { z } from 'zod';

/* ─── Storefront / shared types (kept for backward compat) ─── */

export type ProductCoverageBoard = {
  key: string;
  title: string;
  note: string;
  sourceMode: 'code-seeded' | 'admin-managed';
  enabled?: boolean;
  createdAt?: string;
};

export type ProductBoardConfig = {
  coverageBoards: ProductCoverageBoard[];
};

/* ─── Admin types ─── */

export type AdminProductCoverageBoardTranslation = {
  id: string;
  locale: string;
  name: string;
  description: string | null;
};

export type AdminProductCoverageBoardDetail = {
  id: string;
  key: string;
  enabled: boolean;
  custom: boolean;
  sourceMode: 'code-seeded' | 'admin-managed';
  createdAt?: string;
  translations: AdminProductCoverageBoardTranslation[];
};

export type ProductCoverageMetric = {
  key: string;
  /** Display name resolved from translations (falls back to key) */
  title: string;
  count: number;
  sourceMode: 'code-seeded' | 'admin-managed';
  note: string;
  enabled: boolean;
  custom?: boolean;
  createdAt?: string;
};

export type AdminProductBoardsDashboard = {
  coverage: ProductCoverageMetric[];
  summary: {
    boardCount: number;
    customBoardCount: number;
    assignedProductCount: number;
  };
};

/* ─── Zod schemas ─── */

export const productBoardTranslationInputSchema = z.object({
  locale: z.string().trim().min(1),
  name: z.string().trim().min(1),
  description: z.string().trim().nullable().optional().transform((v) => v || null),
});

export const upsertProductCoverageBoardSchema = z.object({
  key: z.string().trim().min(1),
  translations: z.array(productBoardTranslationInputSchema).min(1),
});

export const patchProductCoverageBoardSchema = z.object({
  enabled: z.boolean(),
});

/* ─── System board ordering ─── */

export const SYSTEM_PRODUCT_BOARD_KEYS = ['featured', 'newest', 'hot-sale'];

const systemBoardOrder = new Map(SYSTEM_PRODUCT_BOARD_KEYS.map((key, index) => [key, index]));

export function isSystemProductBoardKey(key: string) {
  return systemBoardOrder.has(key);
}

export function sortProductCoverageBoards<T extends { key: string; createdAt?: string | null }>(boards: T[]): T[] {
  return [...boards].sort((left, right) => {
    const leftSystem = systemBoardOrder.get(left.key);
    const rightSystem = systemBoardOrder.get(right.key);
    const leftIsSystem = leftSystem !== undefined;
    const rightIsSystem = rightSystem !== undefined;

    if (leftIsSystem && rightIsSystem) return leftSystem! - rightSystem!;
    if (leftIsSystem) return -1;
    if (rightIsSystem) return 1;

    const leftTime = Date.parse(left.createdAt ?? '');
    const rightTime = Date.parse(right.createdAt ?? '');
    if (!Number.isNaN(leftTime) && !Number.isNaN(rightTime) && leftTime !== rightTime) {
      return leftTime - rightTime;
    }
    return left.key.localeCompare(right.key);
  });
}
