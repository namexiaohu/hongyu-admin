import 'server-only';

import { eq, inArray } from 'drizzle-orm';
import { z } from 'zod';

import { normalizeEntityKeyForSave } from '@/lib/admin-entity-key';
import {
  type AdminEditorialCoverageBoardDetail,
  type AdminEditorialCoverageBoardTranslation,
  isSystemBoardKey,
  sortCoverageBoards,
} from '@/lib/editorial-boards';
import {
  defaultEditorialAutomationConfig,
  type EditorialCoverageBoard,
} from '@/lib/editorial-automation';
import { pickTranslationForDisplay } from '@/lib/pick-translation-for-display';
import { getDefaultSiteLanguageCode } from '@/server/admin/site-locale';
import { db } from '@/server/db';
import {
  editorialContentBoards,
  editorialCoverageBoards,
  editorialCoverageBoardTranslations,
  editorialSettings,
} from '@/server/db/schema';

const EDITORIAL_SETTINGS_ROW_ID = 'default';

export const editorialCoverageBoardTranslationInputSchema = z.object({
  locale: z.string().trim().min(1),
  name: z.string().trim().min(1),
  description: z.string().trim().nullable().optional().transform((value) => value || null),
});

export const upsertEditorialCoverageBoardSchema = z.object({
  key: z.string().trim().min(1),
  translations: z.array(editorialCoverageBoardTranslationInputSchema).min(1),
});

export const patchEditorialCoverageBoardSchema = z.object({
  enabled: z.boolean(),
});

type BoardRow = typeof editorialCoverageBoards.$inferSelect;
type TranslationRow = typeof editorialCoverageBoardTranslations.$inferSelect;

function now() {
  return new Date();
}

function toSourceMode(value: string | null | undefined): EditorialCoverageBoard['sourceMode'] {
  return value === 'code-seeded' ? 'code-seeded' : 'admin-managed';
}

function toIso(value: Date | string | null | undefined) {
  if (!value) return undefined;
  if (value instanceof Date) return value.toISOString();
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? undefined : new Date(parsed).toISOString();
}

function mapTranslation(row: TranslationRow): AdminEditorialCoverageBoardTranslation {
  return {
    id: row.id,
    locale: row.locale,
    name: row.name,
    description: row.description,
  };
}

function mapBoardFromRows(
  board: BoardRow,
  translations: TranslationRow[],
  displayLocale: string,
): EditorialCoverageBoard {
  const display = pickTranslationForDisplay(translations, displayLocale);
  return {
    key: board.boardKey,
    title: display?.name?.trim() || board.boardKey,
    contentType: 'content',
    note: display?.description?.trim() || '',
    sourceMode: toSourceMode(board.sourceMode),
    enabled: board.enabled !== false,
    createdAt: toIso(board.createdAt),
  };
}

async function loadTranslationMap(boardIds: string[]) {
  if (!boardIds.length) return new Map<string, TranslationRow[]>();
  const rows = await db
    .select()
    .from(editorialCoverageBoardTranslations)
    .where(inArray(editorialCoverageBoardTranslations.boardId, boardIds));

  const map = new Map<string, TranslationRow[]>();
  for (const row of rows) {
    const bucket = map.get(row.boardId) ?? [];
    bucket.push(row);
    map.set(row.boardId, bucket);
  }
  return map;
}

async function loadBoardRows() {
  return db.select().from(editorialCoverageBoards);
}

async function persistCoverageBoardsJsonSnapshot(boards: EditorialCoverageBoard[]) {
  const [row] = await db.select({ id: editorialSettings.id }).from(editorialSettings).where(eq(editorialSettings.id, EDITORIAL_SETTINGS_ROW_ID)).limit(1);
  if (!row) return;
  await db
    .update(editorialSettings)
    .set({ coverageBoards: boards, updatedAt: now() })
    .where(eq(editorialSettings.id, EDITORIAL_SETTINGS_ROW_ID));
}

export async function listEditorialCoverageBoards(): Promise<EditorialCoverageBoard[]> {
  const [rows, displayLocale] = await Promise.all([
    loadBoardRows(),
    getDefaultSiteLanguageCode(),
  ]);
  const translationMap = await loadTranslationMap(rows.map((row) => row.id));
  return sortCoverageBoards(rows.map((row) => mapBoardFromRows(row, translationMap.get(row.id) ?? [], displayLocale)));
}

export async function ensureEditorialCoverageBoards(jsonBoards: EditorialCoverageBoard[]) {
  const existing = await loadBoardRows();
  const existingKeys = new Set(existing.map((row) => row.boardKey));
  const source = (jsonBoards.length ? jsonBoards : defaultEditorialAutomationConfig.coverageBoards)
    .filter((board) => Boolean(normalizeEntityKeyForSave(board.key)));

  if (!source.length && existing.length) {
    return listEditorialCoverageBoards();
  }

  const defaultLocale = await getDefaultSiteLanguageCode();
  const missing = source.filter((board) => !existingKeys.has(board.key));

  for (const board of missing) {
    const key = normalizeEntityKeyForSave(board.key);
    if (!key) continue;
    const createdAt = board.createdAt ? new Date(board.createdAt) : now();
    const [row] = await db
      .insert(editorialCoverageBoards)
      .values({
        boardKey: key,
        contentType: 'content',
        sourceMode: toSourceMode(board.sourceMode),
        enabled: board.enabled !== false,
        createdAt: Number.isNaN(createdAt.getTime()) ? now() : createdAt,
        updatedAt: now(),
      })
      .onConflictDoNothing({ target: editorialCoverageBoards.boardKey })
      .returning();

    if (!row) continue;

    const name = (board.title ?? '').trim() || key;
    await db.insert(editorialCoverageBoardTranslations).values({
      boardId: row.id,
      locale: defaultLocale,
      name,
      description: (board.note ?? '').trim() || null,
      createdAt: now(),
      updatedAt: now(),
    }).onConflictDoNothing({
      target: [editorialCoverageBoardTranslations.boardId, editorialCoverageBoardTranslations.locale],
    });
  }

  const boards = await listEditorialCoverageBoards();
  if (missing.length) {
    await persistCoverageBoardsJsonSnapshot(boards);
  }
  return boards;
}

export async function getEditorialCoverageBoardDetail(boardKey: string): Promise<AdminEditorialCoverageBoardDetail | null> {
  const key = normalizeEntityKeyForSave(boardKey);
  if (!key) return null;

  const [row] = await db
    .select()
    .from(editorialCoverageBoards)
    .where(eq(editorialCoverageBoards.boardKey, key))
    .limit(1);
  if (!row) return null;

  const translations = await db
    .select()
    .from(editorialCoverageBoardTranslations)
    .where(eq(editorialCoverageBoardTranslations.boardId, row.id));

  return {
    id: row.id,
    key: row.boardKey,
    enabled: row.enabled !== false,
    custom: !isSystemBoardKey(row.boardKey),
    sourceMode: toSourceMode(row.sourceMode),
    createdAt: toIso(row.createdAt),
    translations: translations.map(mapTranslation),
  };
}

export async function upsertEditorialCoverageBoard(input: z.infer<typeof upsertEditorialCoverageBoardSchema>) {
  const key = normalizeEntityKeyForSave(input.key);
  if (!key) {
    throw new Error('INVALID_KEY');
  }

  const [existing] = await db
    .select()
    .from(editorialCoverageBoards)
    .where(eq(editorialCoverageBoards.boardKey, key))
    .limit(1);

  const timestamp = now();
  let board = existing;

  if (!board) {
    const [created] = await db
      .insert(editorialCoverageBoards)
      .values({
        boardKey: key,
        contentType: 'content',
        sourceMode: 'admin-managed',
        enabled: true,
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      .returning();
    board = created;
  } else {
    const [updated] = await db
      .update(editorialCoverageBoards)
      .set({ updatedAt: timestamp })
      .where(eq(editorialCoverageBoards.id, board.id))
      .returning();
    board = updated ?? board;
  }

  if (!board) {
    throw new Error('SAVE_FAILED');
  }

  const existingTranslations = await db
    .select()
    .from(editorialCoverageBoardTranslations)
    .where(eq(editorialCoverageBoardTranslations.boardId, board.id));
  const translationByLocale = new Map(existingTranslations.map((row) => [row.locale, row]));

  for (const translation of input.translations) {
    const locale = translation.locale.trim();
    const name = translation.name.trim();
    const description = translation.description;
    const current = translationByLocale.get(locale);

    if (current) {
      await db
        .update(editorialCoverageBoardTranslations)
        .set({ name, description, updatedAt: timestamp })
        .where(eq(editorialCoverageBoardTranslations.id, current.id));
    } else {
      await db.insert(editorialCoverageBoardTranslations).values({
        boardId: board.id,
        locale,
        name,
        description,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    }
  }

  const boards = await listEditorialCoverageBoards();
  await persistCoverageBoardsJsonSnapshot(boards);
  return getEditorialCoverageBoardDetail(key);
}

export async function setEditorialCoverageBoardEnabled(boardKey: string, enabled: boolean) {
  const key = normalizeEntityKeyForSave(boardKey);
  if (!key) return null;

  const [updated] = await db
    .update(editorialCoverageBoards)
    .set({ enabled, updatedAt: now() })
    .where(eq(editorialCoverageBoards.boardKey, key))
    .returning();

  if (!updated) return null;

  const boards = await listEditorialCoverageBoards();
  await persistCoverageBoardsJsonSnapshot(boards);
  return getEditorialCoverageBoardDetail(key);
}

export async function deleteEditorialCoverageBoard(boardKey: string) {
  const key = normalizeEntityKeyForSave(boardKey);
  if (!key) return false;
  if (isSystemBoardKey(key)) {
    throw new Error('SYSTEM_BOARD');
  }

  const [contentRow] = await db
    .select({ contentId: editorialContentBoards.contentId })
    .from(editorialContentBoards)
    .where(eq(editorialContentBoards.boardKey, key))
    .limit(1);
  if (contentRow) {
    throw new Error('BOARD_HAS_CONTENT');
  }

  const [deleted] = await db
    .delete(editorialCoverageBoards)
    .where(eq(editorialCoverageBoards.boardKey, key))
    .returning({ id: editorialCoverageBoards.id });

  if (!deleted) return false;

  const boards = await listEditorialCoverageBoards();
  await persistCoverageBoardsJsonSnapshot(boards);
  return true;
}
