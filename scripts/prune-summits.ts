import '@/lib/env';

import { notInArray } from 'drizzle-orm';

import { db } from '@/server/db';
import { summits } from '@/server/db/schema';

const KEEP_SLUGS = ['cfvc-2024', 'cfvc-2025', 'cfvc-2021'] as const;
const APPLY = process.argv.includes('--apply');

async function main() {
  const rows = await db
    .select({ id: summits.id, slug: summits.slug })
    .from(summits)
    .where(notInArray(summits.slug, [...KEEP_SLUGS]));

  if (!rows.length) {
    console.log('无需删除：除保留列表外无其它峰会。');
    return;
  }

  console.log(`将删除 ${rows.length} 条峰会（保留: ${KEEP_SLUGS.join(', ')}）:`);
  for (const row of rows) {
    console.log(`  - ${row.slug}`);
  }

  if (!APPLY) {
    console.log('\n[dry-run] 未执行删除。使用 --apply 确认删除。');
    return;
  }

  const deleted = await db
    .delete(summits)
    .where(notInArray(summits.slug, [...KEEP_SLUGS]))
    .returning({ slug: summits.slug });

  console.log(`\n已删除 ${deleted.length} 条:`);
  for (const row of deleted) {
    console.log(`  - ${row.slug}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
