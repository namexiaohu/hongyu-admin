import '@/lib/env';

import { eq } from 'drizzle-orm';

import { getDefaultWebsiteNavColumns } from '@/lib/website-config';
import { db } from '@/server/db';
import { websiteConfigs } from '@/server/db/schema';

async function main() {
  const navColumns = getDefaultWebsiteNavColumns();
  const [existing] = await db.select().from(websiteConfigs).limit(1);

  if (!existing) {
    const [inserted] = await db.insert(websiteConfigs).values({ navColumns }).returning();
    console.log('[seed-website-nav] inserted', inserted?.id);
    return;
  }

  const [updated] = await db
    .update(websiteConfigs)
    .set({ navColumns, updatedAt: new Date() })
    .where(eq(websiteConfigs.id, existing.id))
    .returning();

  console.log('[seed-website-nav] updated', updated?.id, 'columns=', navColumns.length);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
