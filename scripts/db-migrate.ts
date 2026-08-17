import '@/lib/env';

import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

import postgres from 'postgres';

const MIGRATIONS_DIR = path.join(process.cwd(), 'drizzle');
const MIGRATIONS_TABLE = '__app_migrations';

type SqlClient = ReturnType<typeof postgres>;

async function ensureMigrationsTable(sql: SqlClient) {
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS "${MIGRATIONS_TABLE}" (
      "tag" varchar(255) PRIMARY KEY,
      "applied_at" timestamp with time zone DEFAULT now() NOT NULL
    );
  `);
}

async function tableExists(sql: SqlClient, tableName: string) {
  const [row] = await sql<{ exists: boolean }[]>`
    SELECT to_regclass(${`public.${tableName}`}) IS NOT NULL AS exists
  `;
  return Boolean(row?.exists);
}

async function getAppliedTags(sql: SqlClient) {
  const rows = await sql<{ tag: string }[]>`
    SELECT tag FROM ${sql(MIGRATIONS_TABLE)}
    ORDER BY tag
  `;
  return new Set(rows.map((row) => row.tag));
}

async function markApplied(sql: SqlClient, tag: string) {
  await sql`
    INSERT INTO ${sql(MIGRATIONS_TABLE)} (tag)
    VALUES (${tag})
    ON CONFLICT (tag) DO NOTHING
  `;
}

async function listMigrationTags() {
  const files = await readdir(MIGRATIONS_DIR);
  return files
    .filter((file) => /^\d+_.+\.sql$/.test(file))
    .map((file) => file.replace(/\.sql$/, ''))
    .sort();
}

/** If schema already exists (e.g. via db:push) but current migration tags are unmarked, baseline them. */
async function baselineIfNeeded(sql: SqlClient, allTags: string[]) {
  const applied = await getAppliedTags(sql);
  const pending = allTags.filter((tag) => !applied.has(tag));
  if (!pending.length) {
    return;
  }

  const hasProducts = await tableExists(sql, 'products');
  if (!hasProducts) {
    return;
  }

  // Only baseline when none of the current migration tags are applied yet
  // (typical after replacing historical migrations with a single init).
  const anyCurrentApplied = allTags.some((tag) => applied.has(tag));
  if (anyCurrentApplied) {
    return;
  }

  for (const tag of pending) {
    await markApplied(sql, tag);
    console.log(`[db:migrate] Baseline ${tag} (schema already present)`);
  }

  // Drop obsolete historical tags if any remain from the old multi-file chain.
  const obsolete = [...applied].filter((tag) => !allTags.includes(tag));
  for (const tag of obsolete) {
    await sql`DELETE FROM ${sql(MIGRATIONS_TABLE)} WHERE tag = ${tag}`;
    console.log(`[db:migrate] Removed obsolete migration tag ${tag}`);
  }
}

function splitStatements(content: string) {
  return content
    .split(/--> statement-breakpoint\r?\n?/)
    .map((statement) => statement.trim())
    .filter(Boolean);
}

async function runMigrationFile(sql: SqlClient, tag: string) {
  const filePath = path.join(MIGRATIONS_DIR, `${tag}.sql`);
  const content = await readFile(filePath, 'utf8');
  const statements = splitStatements(content);

  await sql.begin(async (tx) => {
    for (const statement of statements) {
      await tx.unsafe(statement);
    }
  });
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required. Configure PostgreSQL in .env before running migrations.');
  }

  const sql = postgres(connectionString, { prepare: false, max: 1 });

  try {
    await ensureMigrationsTable(sql);

    const allTags = await listMigrationTags();
    if (!allTags.length) {
      console.log('[db:migrate] No migration files found in drizzle/.');
      return;
    }

    await baselineIfNeeded(sql, allTags);

    const applied = await getAppliedTags(sql);
    const pending = allTags.filter((tag) => !applied.has(tag));

    if (!pending.length) {
      console.log('[db:migrate] Database is up to date.');
      return;
    }

    for (const tag of pending) {
      console.log(`[db:migrate] Applying ${tag}...`);
      await runMigrationFile(sql, tag);
      await markApplied(sql, tag);
      console.log(`[db:migrate] Applied ${tag}`);
    }

    console.log(`[db:migrate] Done. Applied ${pending.length} migration(s).`);
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error('[db:migrate] Failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
