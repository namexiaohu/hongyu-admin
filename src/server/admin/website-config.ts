import 'server-only';

import { eq } from 'drizzle-orm';

import {
  type AdminWebsiteConfig,
  type AdminWebsiteConfigPutInput,
  adminWebsiteConfigPutSchema,
  compactNavColumns,
  getDefaultWebsiteNavColumns,
} from '@/lib/website-config';
import { db } from '@/server/db';
import { websiteConfigs } from '@/server/db/schema';

function toIso(value: Date) {
  return value.toISOString();
}

function mapConfig(row: typeof websiteConfigs.$inferSelect): AdminWebsiteConfig {
  return {
    id: row.id,
    navColumns: compactNavColumns(row.navColumns),
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

async function ensureWebsiteConfigRow() {
  const [existing] = await db.select().from(websiteConfigs).limit(1);
  if (existing) return existing;

  const [inserted] = await db
    .insert(websiteConfigs)
    .values({
      navColumns: getDefaultWebsiteNavColumns(),
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
  const [updated] = await db
    .update(websiteConfigs)
    .set({
      navColumns: compactNavColumns(parsed.navColumns),
      updatedAt: new Date(),
    })
    .where(eq(websiteConfigs.id, row.id))
    .returning();

  if (!updated) throw new Error('Failed to update website_configs');
  return mapConfig(updated);
}
