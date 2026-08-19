/**
 * clear-categories.ts
 * 
 * Clears all category data after solutions have been migrated to product boards.
 * Run once after verifying migration is complete.
 */
import '@/lib/env';

import postgres from 'postgres';

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is required');

  const sql = postgres(connectionString, { prepare: false, max: 1 });

  try {
    // Drop any remaining foreign key constraints referencing categories
    await sql.unsafe(`ALTER TABLE solutions DROP CONSTRAINT IF EXISTS "solutions_category_id_fkey"`);
    await sql.unsafe(`ALTER TABLE solutions DROP CONSTRAINT IF EXISTS "solutions_category_id_categories_id_fk"`);

    const translations = await sql`DELETE FROM category_translations RETURNING id`;
    console.log(`Deleted ${translations.length} category translations`);

    const cats = await sql`DELETE FROM categories RETURNING id`;
    console.log(`Deleted ${cats.length} categories`);

    console.log('\n分类数据已清空');
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error('Failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
