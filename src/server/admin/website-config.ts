import 'server-only';

import { eq } from 'drizzle-orm';

import {
  type AdminWebsiteConfig,
  type AdminWebsiteConfigPutInput,
  adminWebsiteConfigPutSchema,
  cloneNavColumns,
  compactNavColumns,
  getDefaultWebsiteNavColumns,
  resolveAdminFooterNavColumns,
} from '@/lib/website-config';
import {
  compactListHeroBoards,
  createEmptyListHeroBoards,
  normalizeListHeroBoardsWrite,
} from '@/lib/list-hero-board';
import { mapAdminListHeroBoards } from '@/server/admin/website-config-list-hero';
import { db } from '@/server/db';
import { websiteConfigs } from '@/server/db/schema';

function toIso(value: Date) {
  return value.toISOString();
}

function mapConfig(row: typeof websiteConfigs.$inferSelect): AdminWebsiteConfig {
  const headerNavColumns = compactNavColumns(row.navColumns);
  return {
    id: row.id,
    headerNavColumns,
    footerNavColumns: resolveAdminFooterNavColumns(headerNavColumns, row.footerNavColumns),
    listHeroBoards: mapAdminListHeroBoards(row.listHeroBoards),
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

async function ensureWebsiteConfigRow() {
  const [existing] = await db.select().from(websiteConfigs).limit(1);
  if (existing) return existing;

  const defaultHeader = getDefaultWebsiteNavColumns();
  const [inserted] = await db
    .insert(websiteConfigs)
    .values({
      navColumns: defaultHeader,
      footerNavColumns: cloneNavColumns(defaultHeader),
      listHeroBoards: createEmptyListHeroBoards(),
    })
    .returning();

  if (!inserted) throw new Error('Failed to create website_configs row');
  return inserted;
}

export async function getAdminWebsiteConfig(): Promise<AdminWebsiteConfig> {
  const row = await ensureWebsiteConfigRow();
  return mapConfig(row);
}

export async function updateAdminWebsiteConfig(input: AdminWebsiteConfigPutInput): Promise<AdminWebsiteConfig> {
  const parsed = adminWebsiteConfigPutSchema.parse(input);
  const row = await ensureWebsiteConfigRow();
  const currentBoards = compactListHeroBoards(row.listHeroBoards);
  const nextBoards = parsed.listHeroBoards
    ? normalizeListHeroBoardsWrite(parsed.listHeroBoards, currentBoards)
    : currentBoards;

  const patch: {
    navColumns?: ReturnType<typeof compactNavColumns>;
    footerNavColumns?: ReturnType<typeof compactNavColumns>;
    listHeroBoards?: typeof nextBoards;
    updatedAt: Date;
  } = { updatedAt: new Date() };

  if (parsed.headerNavColumns !== undefined) {
    patch.navColumns = compactNavColumns(parsed.headerNavColumns);
  }
  if (parsed.footerNavColumns !== undefined) {
    patch.footerNavColumns = compactNavColumns(parsed.footerNavColumns);
  }
  if (parsed.listHeroBoards !== undefined) {
    patch.listHeroBoards = nextBoards;
  }

  const [updated] = await db
    .update(websiteConfigs)
    .set(patch)
    .where(eq(websiteConfigs.id, row.id))
    .returning();

  if (!updated) throw new Error('Failed to update website_configs');
  return mapConfig(updated);
}
