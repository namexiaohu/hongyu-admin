/**
 * Sync course UI strings from manifest, then translate en defaultText → zh-CN + es.
 *
 * Usage:
 *   pnpm exec tsx scripts/translate-course-ui-strings-from-en.ts
 *   pnpm exec tsx scripts/translate-course-ui-strings-from-en.ts --dry-run
 */
import '@/lib/env';

import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

import { and, eq } from 'drizzle-orm';

import { UI_STRING_SOURCE_LOCALE } from '@/lib/ui-strings';
import { syncUiStringsFromManifest, translateSingleUiString } from '@/server/admin/ui-strings';
import { db } from '@/server/db';
import { uiStrings } from '@/server/db/schema';

import { CANONICAL_ZH, sleep } from './lib/locale-detect';

if (!db) {
  throw new Error('DATABASE_URL is required');
}

const CANONICAL_ES = 'es';
const TARGETS = [CANONICAL_ZH, CANONICAL_ES] as const;
const DRY_RUN = process.argv.includes('--dry-run');
const delayMs = Number(
  process.argv.find((arg) => arg.startsWith('--delay-ms='))?.split('=')[1]
    ?? process.argv[process.argv.indexOf('--delay-ms') + 1]
    ?? '200',
) || 200;

const logLines: string[] = [];
const summary = { translated: 0, skipped: 0, failed: 0 };

function log(line: string) {
  console.log(line);
  logLines.push(line);
}

function nowIso() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function main() {
  log(`translate-course-ui-strings-from-en ${DRY_RUN ? '(dry-run)' : ''}`);

  const syncResult = await syncUiStringsFromManifest('course');
  log(`manifest synced: active=${syncResult.activeCount} version=${syncResult.manifestVersion}`);

  const rows = await db
    .select({ key: uiStrings.key, defaultText: uiStrings.defaultText })
    .from(uiStrings)
    .where(and(eq(uiStrings.site, 'course'), eq(uiStrings.status, 'active')));

  log(`keys to translate: ${rows.length}`);

  for (const row of rows) {
    const source = row.defaultText.trim();
    if (!source) {
      summary.skipped += 1;
      continue;
    }

    for (const targetLocale of TARGETS) {
      try {
        if (DRY_RUN) {
          summary.translated += 1;
          log(`[dry-run] ${row.key} → ${targetLocale}`);
          continue;
        }
        await translateSingleUiString({
          site: 'course',
          key: row.key,
          targetLocale,
        });
        summary.translated += 1;
        log(`[ok] ${row.key} → ${targetLocale}`);
        await sleep(delayMs);
      } catch (error) {
        summary.failed += 1;
        log(`[failed] ${row.key} → ${targetLocale}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  log('');
  log(`summary: translated=${summary.translated} skipped=${summary.skipped} failed=${summary.failed} source=${UI_STRING_SOURCE_LOCALE}`);

  const logDir = join(process.cwd(), 'scripts', 'logs');
  mkdirSync(logDir, { recursive: true });
  const logPath = join(logDir, `translate-course-ui-strings-from-en-${nowIso()}.log`);
  writeFileSync(logPath, `${logLines.join('\n')}\n`, 'utf8');
  log(`log written: ${logPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
