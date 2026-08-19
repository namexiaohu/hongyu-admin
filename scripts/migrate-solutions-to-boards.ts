/**
 * migrate-solutions-to-boards.ts
 * 
 * Associates existing solutions to product boards based on their category names.
 * Run once after 0015_solution_board_links migration.
 */
import '@/lib/env';

import postgres from 'postgres';

function matchBoardKey(categoryName: string, categorySlug: string): string | null {
  const name = categoryName.toLowerCase();
  const slug = categorySlug.toLowerCase();

  if (name.includes('v-clamp') || slug.includes('v-clamp') || name.includes('v clamp')) {
    return 'v-clamp';
  }
  if (name.includes('运动医学') || name.includes('sports') || slug.includes('sports')) {
    return 'sports-medicine';
  }
  if (name.includes('心脏起搏') || name.includes('pacemaker') || slug.includes('pacemaker')) {
    return 'pacemaker';
  }
  if (name.includes('在研') || name.includes('research') || slug.includes('research')) {
    return 'in-research';
  }
  return null;
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is required');

  const sql = postgres(connectionString, { prepare: false, max: 1 });

  try {
    // Fetch all solutions with their categories
    const solutionRows = await sql<{ id: string; category_id: string | null }[]>`
      SELECT id, category_id FROM solutions
    `;

    // Fetch all category translations
    const categoryIds = [...new Set(solutionRows.map((s) => s.category_id).filter(Boolean) as string[])];
    const categoryRows = categoryIds.length
      ? await sql<{ category_id: string; name: string; slug: string }[]>`
          SELECT DISTINCT ON (category_id) category_id, name, COALESCE(slug, '') as slug
          FROM category_translations
          WHERE category_id = ANY(${categoryIds})
          ORDER BY category_id, locale
        `
      : [];

    // Fetch boards
    const boardRows = await sql<{ id: string; board_key: string }[]>`
      SELECT id, board_key FROM product_coverage_boards WHERE enabled = true
    `;

    const boardKeyToId = new Map(boardRows.map((b) => [b.board_key, b.id]));
    const categoryIdToBoardKey = new Map<string, string>();

    for (const row of categoryRows) {
      const matched = matchBoardKey(row.name, row.slug);
      if (matched) {
        categoryIdToBoardKey.set(row.category_id, matched);
      }
    }

    let linked = 0;
    let skipped = 0;

    for (const solution of solutionRows) {
      if (!solution.category_id) { skipped++; continue; }
      const boardKey = categoryIdToBoardKey.get(solution.category_id);
      if (!boardKey) {
        console.log(`  SKIP solution ${solution.id}: no board match for category ${solution.category_id}`);
        skipped++;
        continue;
      }
      const boardId = boardKeyToId.get(boardKey);
      if (!boardId) {
        console.log(`  SKIP solution ${solution.id}: board key "${boardKey}" not found in DB`);
        skipped++;
        continue;
      }

      await sql`
        INSERT INTO solution_board_links (solution_id, board_id)
        VALUES (${solution.id}, ${boardId})
        ON CONFLICT DO NOTHING
      `;
      console.log(`  LINKED solution ${solution.id} → ${boardKey}`);
      linked++;
    }

    console.log(`\n迁移完成：${linked} 条解决方案已关联看板，${skipped} 条跳过`);
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error('Migration failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
