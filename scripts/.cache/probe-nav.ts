import '@/lib/env';
import postgres from 'postgres';

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
  const rows = await sql`SELECT nav_columns FROM website_configs LIMIT 1`;
  const cols = rows[0]?.nav_columns as Array<Record<string, unknown>>;
  for (const col of cols ?? []) {
    console.log('COL', col.name, 'locales', JSON.stringify(col.locales));
    for (const item of (col.items as Array<Record<string, unknown>>) ?? []) {
      console.log('  ITEM', item.name, 'locales', JSON.stringify(item.locales));
    }
  }
  await sql.end({ timeout: 5 });
}
main().catch((e) => { console.error(e); process.exit(1); });
