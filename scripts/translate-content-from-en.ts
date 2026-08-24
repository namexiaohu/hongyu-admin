/**
 * Translate CMS content from English → zh-CN (skip if real Chinese exists) + es (always overwrite).
 *
 * Usage:
 *   pnpm exec tsx scripts/translate-content-from-en.ts
 *   pnpm exec tsx scripts/translate-content-from-en.ts --dry-run
 *   pnpm exec tsx scripts/translate-content-from-en.ts --modules=product,surgeon --targets=zh-CN,es
 *   pnpm exec tsx scripts/translate-content-from-en.ts --delay-ms=400
 */
import '@/lib/env';

import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

import { and, eq, ne } from 'drizzle-orm';

import type { ContentTranslateType } from '@/lib/content-translate-config';
import { resolveSlugForSave } from '@/lib/slug';
import { translateContentFields } from '@/server/ai/translate';
import { db } from '@/server/db';
import {
  brandNarrativeContents,
  brandNarratives,
  brandNarrativeTranslations,
  companyProfileTranslations,
  companyProfiles,
  editorialContents,
  editorialContentTranslations,
  homepageConfigs,
  homepageConfigTranslations,
  partnerCenters,
  partnerCenterTranslations,
  productTranslations,
  products,
  socialMediaProfiles,
  socialMediaProfileTranslations,
  solutionContents,
  solutions,
  solutionTranslations,
  surgeons,
  surgeonTranslations,
  summits,
  summitTranslations,
  websiteConfigs,
} from '@/server/db/schema';

import {
  CANONICAL_EN,
  CANONICAL_ZH,
  collectText,
  detectLang,
  isEnLocale,
  isZhLocale,
  pickPreferredLocaleRow,
  sleep,
} from './lib/locale-detect';

if (!db) {
  throw new Error('DATABASE_URL is required');
}

const CANONICAL_ES = 'es';

const DRY_RUN = process.argv.includes('--dry-run');
const delayMs = Number(
  process.argv.find((arg) => arg.startsWith('--delay-ms='))?.split('=')[1]
    ?? process.argv[process.argv.indexOf('--delay-ms') + 1]
    ?? '350',
) || 350;

const modulesArg = process.argv.find((arg) => arg.startsWith('--modules='))?.split('=')[1]
  ?? (process.argv.includes('--modules') ? process.argv[process.argv.indexOf('--modules') + 1] : '');
const ONLY_MODULES = modulesArg
  ? new Set(modulesArg.split(/[,\s]+/).map((item) => item.trim()).filter(Boolean))
  : null;

const targetsArg = process.argv.find((arg) => arg.startsWith('--targets='))?.split('=')[1]
  ?? (process.argv.includes('--targets') ? process.argv[process.argv.indexOf('--targets') + 1] : '');
const TARGETS = new Set(
  (targetsArg || 'zh-CN,es').split(/[,\s]+/).map((item) => item.trim()).filter(Boolean),
);
const WANT_ZH = TARGETS.has('zh-CN') || TARGETS.has('zh');
const WANT_ES = TARGETS.has('es');

type RowLike = {
  id: string;
  locale: string;
  [key: string]: unknown;
};

type LocalesMap = Record<string, Record<string, unknown>>;

type LogAction = { module: string; entity: string; action: string; detail?: string };

const logLines: string[] = [];
const summary = {
  skip_zh: 0,
  translate_zh: 0,
  translate_es: 0,
  missing_en: 0,
  failed: 0,
  ok: 0,
};

function log(line: string) {
  console.log(line);
  logLines.push(line);
}

function record(entry: LogAction) {
  log(`[${entry.module}] ${entry.entity} → ${entry.action}${entry.detail ? ` (${entry.detail})` : ''}`);
}

function shouldRun(module: string) {
  return !ONLY_MODULES || ONLY_MODULES.has(module);
}

function nowIso() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function textFromLocalesCopy(copy: Record<string, unknown> | null | undefined) {
  if (!copy) return '';
  const keys = [
    'smallTitle', 'largeTitle', 'description', 'buttonLabel', 'badge',
    'totalHours', 'teachingFormat', 'trainingCycle',
    'dayLabel', 'groupTitle', 'title', 'desc', 'speaker', 'name',
  ];
  return collectText(keys.map((key) => copy[key]));
}

function pickLocaleCopy(locales: LocalesMap | undefined, family: 'zh' | 'en' | 'es') {
  if (!locales) return { key: null as string | null, copy: null as Record<string, unknown> | null };
  const entries = Object.entries(locales).filter(([code]) => {
    if (family === 'zh') return isZhLocale(code);
    if (family === 'en') return isEnLocale(code);
    return code === 'es' || code.toLowerCase().startsWith('es');
  });
  if (!entries.length) return { key: null, copy: null };
  const preferred = family === 'zh' ? CANONICAL_ZH : family === 'en' ? CANONICAL_EN : CANONICAL_ES;
  const hit = entries.find(([code]) => code === preferred) ?? entries[0]!;
  return { key: hit[0], copy: hit[1] };
}

function pickEsRow(rows: RowLike[]) {
  return rows.find((row) => row.locale === CANONICAL_ES)
    ?? rows.find((row) => row.locale.toLowerCase().startsWith('es'))
    ?? null;
}

function rowHasText(row: RowLike | null, textKeys: string[]) {
  if (!row) return false;
  return collectText(textKeys.map((key) => row[key])).length > 0;
}

/** zh-CN row counts as translated only when text is actually Chinese (not English placeholder). */
function rowHasChineseText(row: RowLike | null, textKeys: string[]) {
  if (!row) return false;
  const text = collectText(textKeys.map((key) => row[key]));
  if (!text) return false;
  const lang = detectLang(text);
  return lang === 'zh' || lang === 'mixed';
}

function localesCopyIsChinese(copy: Record<string, unknown> | null | undefined, fieldKeys: string[]) {
  const text = fieldKeys
    .map((key) => copy?.[key])
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .join(' ');
  if (!text) return false;
  const lang = detectLang(text);
  return lang === 'zh' || lang === 'mixed';
}

function pickTextPayload(row: RowLike, textKeys: string[]): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  for (const key of textKeys) payload[key] = cloneJson(row[key]);
  return payload;
}

async function translateFields(
  contentType: ContentTranslateType,
  targetLocale: string,
  fields: Record<string, string>,
): Promise<Record<string, string>> {
  const nonempty: Record<string, string> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value?.trim()) nonempty[key] = value;
  }
  if (!Object.keys(nonempty).length) return {};
  return translateContentFields({
    contentType,
    sourceLocale: CANONICAL_EN,
    targetLocale,
    fields: nonempty,
  });
}

async function upsertLocaleRow(options: {
  parentKey: string;
  parentId: string;
  locale: string;
  textKeys: string[];
  payload: Record<string, unknown>;
  existing: RowLike | null;
  allRows: RowLike[];
  insert: (values: Record<string, unknown>) => Promise<void>;
  update: (id: string, values: Record<string, unknown>) => Promise<void>;
  templateRow: RowLike;
  prepareInsert?: (values: Record<string, unknown>, locale: string) => Promise<Record<string, unknown>>;
}) {
  const {
    parentKey, parentId, locale, textKeys, payload, existing, insert, update, templateRow,
  } = options;

  if (DRY_RUN) return;

  if (existing) {
    const patch: Record<string, unknown> = { updatedAt: new Date(), locale };
    for (const key of textKeys) {
      if (key in payload) patch[key] = payload[key];
    }
    await update(existing.id, patch);
    for (const key of textKeys) {
      if (key in payload) existing[key] = cloneJson(payload[key]);
    }
    existing.locale = locale;
    return;
  }

  const base = cloneJson(templateRow);
  delete (base as { id?: string }).id;
  let values: Record<string, unknown> = {
    ...base,
    [parentKey]: parentId,
    locale,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  for (const key of textKeys) {
    if (key in payload) values[key] = payload[key];
  }
  if (options.prepareInsert) {
    values = await options.prepareInsert(values, locale);
  }
  await insert(values);
  options.allRows.push({ id: 'new', locale, ...values } as RowLike);
}

async function translateTranslationGroup(options: {
  module: string;
  entity: string;
  parentKey: string;
  parentId: string;
  textKeys: string[];
  rows: RowLike[];
  contentType: ContentTranslateType;
  toTranslateFields: (row: RowLike) => Record<string, string>;
  fromTranslateFields: (fields: Record<string, string>, base: RowLike) => Record<string, unknown>;
  insert: (values: Record<string, unknown>) => Promise<void>;
  update: (id: string, values: Record<string, unknown>) => Promise<void>;
  prepareInsert?: (values: Record<string, unknown>, locale: string) => Promise<Record<string, unknown>>;
}) {
  const {
    module, entity, parentKey, parentId, textKeys, rows, contentType,
    toTranslateFields, fromTranslateFields, insert, update, prepareInsert,
  } = options;

  const enRow = pickPreferredLocaleRow(rows, 'en');
  if (!enRow || !rowHasText(enRow, textKeys)) {
    summary.missing_en += 1;
    record({ module, entity, action: 'missing_en' });
    return;
  }

  const zhRow = pickPreferredLocaleRow(rows, 'zh');
  const esRow = pickEsRow(rows);
  const sourceFields = toTranslateFields(enRow);

  try {
    if (WANT_ZH) {
      if (rowHasChineseText(zhRow, textKeys)) {
        summary.skip_zh += 1;
        record({ module, entity, action: 'skip_zh' });
      } else {
        if (DRY_RUN) {
          summary.translate_zh += 1;
          record({ module, entity, action: 'dry-translate_zh' });
        } else {
          const translated = await translateFields(contentType, CANONICAL_ZH, sourceFields);
          const payload = {
            ...pickTextPayload(enRow, textKeys),
            ...fromTranslateFields(translated, enRow),
          };
          await upsertLocaleRow({
            parentKey, parentId, locale: CANONICAL_ZH, textKeys, payload,
            existing: zhRow && isZhLocale(zhRow.locale) ? zhRow : null,
            allRows: rows, insert, update, templateRow: enRow, prepareInsert,
          });
          summary.translate_zh += 1;
          record({ module, entity, action: 'translate_zh' });
          await sleep(delayMs);
        }
      }
    }

    if (WANT_ES) {
      if (DRY_RUN) {
        summary.translate_es += 1;
        record({ module, entity, action: 'dry-translate_es' });
      } else {
        const translated = await translateFields(contentType, CANONICAL_ES, sourceFields);
        const payload = {
          ...pickTextPayload(enRow, textKeys),
          ...fromTranslateFields(translated, enRow),
        };
        await upsertLocaleRow({
          parentKey, parentId, locale: CANONICAL_ES, textKeys, payload,
          existing: esRow, allRows: rows, insert, update, templateRow: enRow, prepareInsert,
        });
        summary.translate_es += 1;
        record({ module, entity, action: 'translate_es' });
        await sleep(delayMs);
      }
    }

    summary.ok += 1;
  } catch (error) {
    summary.failed += 1;
    const message = error instanceof Error ? error.message : String(error);
    record({ module, entity, action: 'failed', detail: message });
  }
}

async function translateLocalesMap(options: {
  module: string;
  entity: string;
  locales: LocalesMap | undefined;
  contentType: ContentTranslateType;
  fieldKeys: string[];
}): Promise<{ locales: LocalesMap; changed: boolean }> {
  const locales: LocalesMap = cloneJson(options.locales ?? {});
  let changed = false;

  const en = pickLocaleCopy(locales, 'en');
  const enText = textFromLocalesCopy(en.copy ?? undefined);
  if (!en.copy || !enText) {
    summary.missing_en += 1;
    record({ module: options.module, entity: options.entity, action: 'missing_en-locales' });
    return { locales, changed };
  }

  const zh = pickLocaleCopy(locales, 'zh');
  const zhText = textFromLocalesCopy(zh.copy ?? undefined);

  const sourceFields: Record<string, string> = {};
  for (const key of options.fieldKeys) {
    const value = en.copy[key];
    if (typeof value === 'string' && value.trim()) sourceFields[key] = value;
  }
  if (!Object.keys(sourceFields).length) {
    summary.missing_en += 1;
    record({ module: options.module, entity: options.entity, action: 'missing_en-locales' });
    return { locales, changed };
  }

  try {
    if (WANT_ZH) {
      if (localesCopyIsChinese(zh.copy, options.fieldKeys)) {
        summary.skip_zh += 1;
        record({ module: options.module, entity: options.entity, action: 'skip_zh-locales' });
      } else if (DRY_RUN) {
        summary.translate_zh += 1;
        changed = true;
        record({ module: options.module, entity: options.entity, action: 'dry-translate_zh-locales' });
      } else {
        const translated = await translateFields(options.contentType, CANONICAL_ZH, sourceFields);
        locales[CANONICAL_ZH] = { ...cloneJson(en.copy), ...translated };
        changed = true;
        summary.translate_zh += 1;
        record({ module: options.module, entity: options.entity, action: 'translate_zh-locales' });
        await sleep(delayMs);
      }
    }

    if (WANT_ES) {
      if (DRY_RUN) {
        summary.translate_es += 1;
        changed = true;
        record({ module: options.module, entity: options.entity, action: 'dry-translate_es-locales' });
      } else {
        const translated = await translateFields(options.contentType, CANONICAL_ES, sourceFields);
        locales[CANONICAL_ES] = { ...cloneJson(en.copy), ...translated };
        changed = true;
        summary.translate_es += 1;
        record({ module: options.module, entity: options.entity, action: 'translate_es-locales' });
        await sleep(delayMs);
      }
    }
  } catch (error) {
    summary.failed += 1;
    const message = error instanceof Error ? error.message : String(error);
    record({ module: options.module, entity: options.entity, action: 'failed', detail: message });
  }

  return { locales, changed };
}

async function translateBlocksTree(options: {
  module: string;
  entity: string;
  blocks: unknown[];
}): Promise<{ blocks: unknown[]; changed: boolean }> {
  const blocks = cloneJson(options.blocks);
  let changed = false;
  const isSolution = options.module === 'solution';

  for (let i = 0; i < blocks.length; i += 1) {
    const block = blocks[i] as Record<string, unknown>;
    if (!block || typeof block !== 'object') continue;

    if (block.locales && typeof block.locales === 'object') {
      const result = await translateLocalesMap({
        module: options.module,
        entity: `${options.entity}#block${i}`,
        locales: block.locales as LocalesMap,
        contentType: isSolution ? 'solutionBlock' : 'brandNarrativeBlock',
        fieldKeys: ['smallTitle', 'largeTitle', 'description', 'buttonLabel'],
      });
      block.locales = result.locales;
      changed = changed || result.changed;
    }

    const items = Array.isArray(block.items) ? block.items as Array<Record<string, unknown>> : [];
    for (let j = 0; j < items.length; j += 1) {
      const item = items[j]!;
      if (item.locales && typeof item.locales === 'object') {
        const result = await translateLocalesMap({
          module: options.module,
          entity: `${options.entity}#block${i}.item${j}`,
          locales: item.locales as LocalesMap,
          contentType: isSolution ? 'solutionBlockItem' : 'brandNarrativeBlockItem',
          fieldKeys: ['smallTitle', 'largeTitle', 'description', 'badge', 'totalHours', 'teachingFormat', 'trainingCycle'],
        });
        item.locales = result.locales;
        changed = changed || result.changed;
      }
    }
  }

  return { blocks, changed };
}

/** Nav: Chinese main name = existing zh; source en from locales.en; always overwrite locales.es */
async function translateNavNameNode(options: {
  module: string;
  entity: string;
  name: string;
  locales: LocalesMap;
  contentType: ContentTranslateType;
}): Promise<{ name: string; locales: LocalesMap; changed: boolean }> {
  const locales = cloneJson(options.locales);
  let name = options.name;
  let changed = false;

  const mainLang = detectLang(name);
  const en = pickLocaleCopy(locales, 'en');
  let enName = String(en.copy?.name ?? '');
  if (!enName && mainLang === 'en') enName = name;
  if (!enName.trim()) {
    summary.missing_en += 1;
    record({ module: options.module, entity: options.entity, action: 'missing_en-nav' });
    return { name, locales, changed };
  }

  const hasZh = mainLang === 'zh' || mainLang === 'mixed'
    || Boolean(textFromLocalesCopy(pickLocaleCopy(locales, 'zh').copy ?? undefined));

  try {
    if (WANT_ZH) {
      if (hasZh) {
        summary.skip_zh += 1;
        record({ module: options.module, entity: options.entity, action: 'skip_zh-nav' });
      } else if (DRY_RUN) {
        summary.translate_zh += 1;
        changed = true;
        record({ module: options.module, entity: options.entity, action: 'dry-translate_zh-nav' });
      } else {
        const translated = await translateFields(options.contentType, CANONICAL_ZH, { name: enName });
        if (translated.name) {
          name = translated.name;
          changed = true;
        }
        summary.translate_zh += 1;
        record({ module: options.module, entity: options.entity, action: 'translate_zh-nav' });
        await sleep(delayMs);
      }
    }

    if (WANT_ES) {
      if (DRY_RUN) {
        summary.translate_es += 1;
        changed = true;
        record({ module: options.module, entity: options.entity, action: 'dry-translate_es-nav' });
      } else {
        const translated = await translateFields(options.contentType, CANONICAL_ES, { name: enName });
        locales[CANONICAL_ES] = { name: translated.name ?? enName };
        // keep existing en in locales; strip accidental zh keys from locales (main holds zh)
        for (const code of Object.keys(locales)) {
          if (isZhLocale(code)) delete locales[code];
        }
        if (en.copy) locales[CANONICAL_EN] = en.copy;
        else if (mainLang === 'en') locales[CANONICAL_EN] = { name: enName };
        changed = true;
        summary.translate_es += 1;
        record({ module: options.module, entity: options.entity, action: 'translate_es-nav' });
        await sleep(delayMs);
      }
    }
  } catch (error) {
    summary.failed += 1;
    const message = error instanceof Error ? error.message : String(error);
    record({ module: options.module, entity: options.entity, action: 'failed', detail: message });
  }

  return { name, locales, changed };
}

async function resolveUniqueProductSlug(name: string, locale: string, productId: string) {
  const base = resolveSlugForSave({ sourceText: name }) ?? `product-${productId.slice(0, 8)}`;
  let candidate = base;
  let suffix = 2;
  while (true) {
    const [conflict] = await db!
      .select({ id: productTranslations.id })
      .from(productTranslations)
      .where(and(eq(productTranslations.slug, candidate), eq(productTranslations.locale, locale)))
      .limit(1);
    if (!conflict) return candidate;
    candidate = `${base}-${suffix}`;
    suffix += 1;
    if (suffix > 50) return `${base}-${productId.slice(0, 8)}`;
  }
}

async function resolveUniqueEditorialSlug(
  title: string,
  locale: string,
  contentId: string,
  excludeId?: string,
) {
  const base = resolveSlugForSave({ sourceText: title }) ?? `post-${contentId.slice(0, 8)}`;
  let candidate = base;
  let suffix = 2;
  while (true) {
    const conditions = [
      eq(editorialContentTranslations.slug, candidate),
      eq(editorialContentTranslations.locale, locale),
      eq(editorialContentTranslations.contentModule, 'editorial'),
    ];
    if (excludeId) conditions.push(ne(editorialContentTranslations.id, excludeId));
    const [conflict] = await db!
      .select({ id: editorialContentTranslations.id })
      .from(editorialContentTranslations)
      .where(and(...conditions))
      .limit(1);
    if (!conflict) return candidate;
    candidate = `${base}-${suffix}`;
    suffix += 1;
    if (suffix > 50) return `${base}-${contentId.slice(0, 8)}`;
  }
}

/* ───── Module runners ───── */

async function runProducts() {
  if (!shouldRun('product')) return;
  log('\n=== 产品 products ===');
  const textKeys = [
    'name', 'badgeText', 'extraText', 'shortDescription', 'description',
    'seoTitle', 'seoDescription', 'stats', 'payload',
  ];
  const [parents, all] = await Promise.all([
    db!.select({ id: products.id, spu: products.spu }).from(products),
    db!.select().from(productTranslations),
  ]);
  const byParent = new Map<string, RowLike[]>();
  for (const row of all) {
    const list = byParent.get(row.productId) ?? [];
    list.push(row as unknown as RowLike);
    byParent.set(row.productId, list);
  }

  for (const parent of parents) {
    const rows = byParent.get(parent.id) ?? [];
    if (!rows.length) continue;
    await translateTranslationGroup({
      module: 'product',
      entity: parent.spu,
      parentKey: 'productId',
      parentId: parent.id,
      textKeys,
      rows,
      contentType: 'product',
      toTranslateFields: (row) => {
        const payload = (row.payload ?? {}) as Record<string, unknown>;
        return {
          name: String(row.name ?? ''),
          badgeText: String(row.badgeText ?? ''),
          extraText: String(row.extraText ?? ''),
          shortDescription: String(row.shortDescription ?? ''),
          description: String(row.description ?? ''),
          seoTitle: String(row.seoTitle ?? ''),
          seoDescription: String(row.seoDescription ?? ''),
          statsText: Array.isArray(row.stats)
            ? (row.stats as Array<{ label?: string; value?: string }>).map((item) => `${item.label ?? ''}|||${item.value ?? ''}`).join('\n')
            : '',
          tagsText: Array.isArray(payload.tags) ? (payload.tags as string[]).join('\n') : '',
          certificationsText: Array.isArray(payload.certifications)
            ? (payload.certifications as string[]).join('\n')
            : '',
        };
      },
      fromTranslateFields: (fields, base) => {
        const payload = cloneJson((base.payload ?? {}) as Record<string, unknown>);
        if (fields.tagsText) {
          payload.tags = fields.tagsText.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
        }
        if (fields.certificationsText) {
          payload.certifications = fields.certificationsText.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
        }
        return {
          name: fields.name ?? base.name,
          badgeText: fields.badgeText ?? base.badgeText,
          extraText: fields.extraText ?? base.extraText,
          shortDescription: fields.shortDescription ?? base.shortDescription,
          description: fields.description ?? base.description,
          seoTitle: fields.seoTitle ?? base.seoTitle,
          seoDescription: fields.seoDescription ?? base.seoDescription,
          stats: fields.statsText
            ? fields.statsText.split(/\r?\n/).map((line) => {
                const [label = '', value = ''] = line.split('|||');
                return { label: label.trim(), value: value.trim() };
              })
            : base.stats,
          payload,
        };
      },
      insert: async (values) => {
        await db!.insert(productTranslations).values(values as typeof productTranslations.$inferInsert);
      },
      update: async (id, values) => {
        await db!.update(productTranslations)
          .set(values as Partial<typeof productTranslations.$inferInsert>)
          .where(eq(productTranslations.id, id));
      },
      prepareInsert: async (values, locale) => {
        const name = String(values.name ?? parent.spu);
        const slug = await resolveUniqueProductSlug(name, locale, parent.id);
        return { ...values, slug, locale };
      },
    });
  }
}

async function runBrandNarratives() {
  if (!shouldRun('brandNarrative')) return;
  log('\n=== 企业叙事 brand narratives ===');
  const textKeys = ['title', 'largeTitle', 'description', 'seoTitle', 'seoDescription', 'stats'];
  const [parents, all, contents] = await Promise.all([
    db!.select({ id: brandNarratives.id, slug: brandNarratives.slug }).from(brandNarratives),
    db!.select().from(brandNarrativeTranslations),
    db!.select().from(brandNarrativeContents),
  ]);
  const byParent = new Map<string, RowLike[]>();
  for (const row of all) {
    const list = byParent.get(row.narrativeId) ?? [];
    list.push(row as unknown as RowLike);
    byParent.set(row.narrativeId, list);
  }
  const contentByParent = new Map(contents.map((row) => [row.narrativeId, row]));

  for (const parent of parents) {
    const rows = byParent.get(parent.id) ?? [];
    if (rows.length) {
      await translateTranslationGroup({
        module: 'brandNarrative',
        entity: parent.slug,
        parentKey: 'narrativeId',
        parentId: parent.id,
        textKeys,
        rows,
        contentType: 'brandNarrative',
        toTranslateFields: (row) => ({
          heroTitle: String(row.title ?? ''),
          heroSlogan: String(row.largeTitle ?? ''),
          heroLead: String(row.description ?? ''),
          seoTitle: String(row.seoTitle ?? ''),
          seoDescription: String(row.seoDescription ?? ''),
          statsText: Array.isArray(row.stats)
            ? (row.stats as Array<{ label: string; value: string }>).map((item) => `${item.label}|||${item.value}`).join('\n')
            : '',
        }),
        fromTranslateFields: (fields, base) => ({
          title: fields.heroTitle ?? base.title,
          largeTitle: fields.heroSlogan ?? base.largeTitle,
          description: fields.heroLead ?? base.description,
          seoTitle: fields.seoTitle ?? base.seoTitle,
          seoDescription: fields.seoDescription ?? base.seoDescription,
          stats: fields.statsText
            ? fields.statsText.split(/\r?\n/).map((line) => {
                const [label = '', value = ''] = line.split('|||');
                return { label: label.trim(), value: value.trim() };
              })
            : base.stats,
        }),
        insert: async (values) => {
          await db!.insert(brandNarrativeTranslations).values(values as typeof brandNarrativeTranslations.$inferInsert);
        },
        update: async (id, values) => {
          await db!.update(brandNarrativeTranslations)
            .set(values as Partial<typeof brandNarrativeTranslations.$inferInsert>)
            .where(eq(brandNarrativeTranslations.id, id));
        },
      });
    }

    const content = contentByParent.get(parent.id);
    if (content?.blocks?.length) {
      const result = await translateBlocksTree({
        module: 'brandNarrative',
        entity: parent.slug,
        blocks: content.blocks as unknown[],
      });
      if (result.changed && !DRY_RUN) {
        await db!.update(brandNarrativeContents)
          .set({ blocks: result.blocks as never, updatedAt: new Date() })
          .where(eq(brandNarrativeContents.id, content.id));
      }
    }
  }
}

async function runSolutions() {
  if (!shouldRun('solution')) return;
  log('\n=== 解决方案 solutions ===');
  const textKeys = [
    'title', 'largeTitle', 'description', 'badgeText',
    'seoTitle', 'seoDescription', 'stats', 'productParams', 'tags',
  ];
  const [parents, all, contents] = await Promise.all([
    db!.select({ id: solutions.id, slug: solutions.slug }).from(solutions),
    db!.select().from(solutionTranslations),
    db!.select().from(solutionContents),
  ]);
  const byParent = new Map<string, RowLike[]>();
  for (const row of all) {
    const list = byParent.get(row.solutionId) ?? [];
    list.push(row as unknown as RowLike);
    byParent.set(row.solutionId, list);
  }
  const contentByParent = new Map(contents.map((row) => [row.solutionId, row]));

  for (const parent of parents) {
    const rows = byParent.get(parent.id) ?? [];
    if (rows.length) {
      await translateTranslationGroup({
        module: 'solution',
        entity: parent.slug,
        parentKey: 'solutionId',
        parentId: parent.id,
        textKeys,
        rows,
        contentType: 'solution',
        toTranslateFields: (row) => ({
          heroTitle: String(row.title ?? ''),
          heroSlogan: String(row.largeTitle ?? ''),
          heroLead: String(row.description ?? ''),
          badgeText: String(row.badgeText ?? ''),
          seoTitle: String(row.seoTitle ?? ''),
          seoDescription: String(row.seoDescription ?? ''),
          statsText: Array.isArray(row.stats)
            ? (row.stats as Array<{ label: string; value: string }>).map((item) => `${item.label}|||${item.value}`).join('\n')
            : '',
          productParamsText: Array.isArray(row.productParams)
            ? (row.productParams as Array<{ label: string; value: string }>).map((item) => `${item.label}|||${item.value}`).join('\n')
            : '',
          tagsText: Array.isArray(row.tags) ? (row.tags as string[]).join('\n') : '',
        }),
        fromTranslateFields: (fields, base) => ({
          title: fields.heroTitle ?? base.title,
          largeTitle: fields.heroSlogan ?? base.largeTitle,
          description: fields.heroLead ?? base.description,
          badgeText: fields.badgeText ?? base.badgeText,
          seoTitle: fields.seoTitle ?? base.seoTitle,
          seoDescription: fields.seoDescription ?? base.seoDescription,
          stats: fields.statsText
            ? fields.statsText.split(/\r?\n/).map((line) => {
                const [label = '', value = ''] = line.split('|||');
                return { label: label.trim(), value: value.trim() };
              })
            : base.stats,
          productParams: fields.productParamsText
            ? fields.productParamsText.split(/\r?\n/).map((line) => {
                const [label = '', value = ''] = line.split('|||');
                return { label: label.trim(), value: value.trim() };
              })
            : base.productParams,
          tags: fields.tagsText ? fields.tagsText.split(/\r?\n/).filter(Boolean) : base.tags,
        }),
        insert: async (values) => {
          await db!.insert(solutionTranslations).values(values as typeof solutionTranslations.$inferInsert);
        },
        update: async (id, values) => {
          await db!.update(solutionTranslations)
            .set(values as Partial<typeof solutionTranslations.$inferInsert>)
            .where(eq(solutionTranslations.id, id));
        },
      });
    }

    const content = contentByParent.get(parent.id);
    if (content?.blocks?.length) {
      const result = await translateBlocksTree({
        module: 'solution',
        entity: parent.slug,
        blocks: content.blocks as unknown[],
      });
      if (result.changed && !DRY_RUN) {
        await db!.update(solutionContents)
          .set({ blocks: result.blocks as never, updatedAt: new Date() })
          .where(eq(solutionContents.id, content.id));
      }
    }
  }
}

async function runSurgeons() {
  if (!shouldRun('surgeon')) return;
  log('\n=== 认证术者 surgeons ===');
  const textKeys = [
    'name', 'position', 'institution', 'expertise', 'experience', 'gradeTitle',
    'detailDescription', 'tags', 'otherCertifications', 'specialties',
  ];
  const [parents, all] = await Promise.all([
    db!.select({ id: surgeons.id, slug: surgeons.slug }).from(surgeons),
    db!.select().from(surgeonTranslations),
  ]);
  const byParent = new Map<string, RowLike[]>();
  for (const row of all) {
    const list = byParent.get(row.surgeonId) ?? [];
    list.push(row as unknown as RowLike);
    byParent.set(row.surgeonId, list);
  }

  for (const parent of parents) {
    const rows = byParent.get(parent.id) ?? [];
    if (!rows.length) continue;
    await translateTranslationGroup({
      module: 'surgeon',
      entity: parent.slug,
      parentKey: 'surgeonId',
      parentId: parent.id,
      textKeys,
      rows,
      contentType: 'surgeon',
      toTranslateFields: (row) => ({
        name: String(row.name ?? ''),
        position: String(row.position ?? ''),
        institution: String(row.institution ?? ''),
        expertise: String(row.expertise ?? ''),
        experience: String(row.experience ?? ''),
        gradeTitle: String(row.gradeTitle ?? ''),
        detailDescription: String(row.detailDescription ?? ''),
        tagsText: Array.isArray(row.tags) ? (row.tags as string[]).join('\n') : '',
        otherCertificationsText: Array.isArray(row.otherCertifications)
          ? (row.otherCertifications as Array<{ label: string; value: string }>).map((item) => `${item.label}|||${item.value}`).join('\n')
          : '',
        specialtiesText: Array.isArray(row.specialties) ? (row.specialties as string[]).join('\n') : '',
      }),
      fromTranslateFields: (fields, base) => ({
        name: fields.name ?? base.name,
        position: fields.position ?? base.position,
        institution: fields.institution ?? base.institution,
        expertise: fields.expertise ?? base.expertise,
        experience: fields.experience ?? base.experience,
        gradeTitle: fields.gradeTitle ?? base.gradeTitle,
        detailDescription: fields.detailDescription ?? base.detailDescription,
        tags: fields.tagsText ? fields.tagsText.split(/\r?\n/).map((item) => item.trim()).filter(Boolean) : base.tags,
        specialties: fields.specialtiesText
          ? fields.specialtiesText.split(/\r?\n/).map((item) => item.trim()).filter(Boolean)
          : base.specialties,
        otherCertifications: fields.otherCertificationsText
          ? fields.otherCertificationsText.split(/\r?\n/).map((line) => {
              const [label = '', value = ''] = line.split('|||');
              return { label: label.trim(), value: value.trim() };
            })
          : base.otherCertifications,
      }),
      insert: async (values) => {
        await db!.insert(surgeonTranslations).values(values as typeof surgeonTranslations.$inferInsert);
      },
      update: async (id, values) => {
        await db!.update(surgeonTranslations)
          .set(values as Partial<typeof surgeonTranslations.$inferInsert>)
          .where(eq(surgeonTranslations.id, id));
      },
    });
  }
}

async function runPartnerCenters() {
  if (!shouldRun('partnerCenter')) return;
  log('\n=== 合作中心 partner centers ===');
  const textKeys = [
    'name', 'description', 'detailDescription', 'location', 'badgeText',
    'address', 'businessHours', 'contact', 'tags', 'stats', 'cooperationInfo',
  ];
  const [parents, all] = await Promise.all([
    db!.select({ id: partnerCenters.id, slug: partnerCenters.slug }).from(partnerCenters),
    db!.select().from(partnerCenterTranslations),
  ]);
  const byParent = new Map<string, RowLike[]>();
  for (const row of all) {
    const list = byParent.get(row.centerId) ?? [];
    list.push(row as unknown as RowLike);
    byParent.set(row.centerId, list);
  }

  for (const parent of parents) {
    const rows = byParent.get(parent.id) ?? [];
    if (!rows.length) continue;
    await translateTranslationGroup({
      module: 'partnerCenter',
      entity: parent.slug,
      parentKey: 'centerId',
      parentId: parent.id,
      textKeys,
      rows,
      contentType: 'partnerCenter',
      toTranslateFields: (row) => ({
        name: String(row.name ?? ''),
        description: String(row.description ?? ''),
        detailDescription: String(row.detailDescription ?? ''),
        location: String(row.location ?? ''),
        badgeText: String(row.badgeText ?? ''),
        address: String(row.address ?? ''),
        businessHours: String(row.businessHours ?? ''),
        contact: String(row.contact ?? ''),
        tagsText: Array.isArray(row.tags) ? (row.tags as string[]).join('\n') : '',
        statsText: Array.isArray(row.stats)
          ? (row.stats as Array<{ label: string; value: string }>).map((item) => `${item.label}|||${item.value}`).join('\n')
          : '',
        cooperationInfoText: Array.isArray(row.cooperationInfo)
          ? (row.cooperationInfo as Array<{ label: string; value: string }>).map((item) => `${item.label}|||${item.value}`).join('\n')
          : '',
      }),
      fromTranslateFields: (fields, base) => ({
        name: fields.name ?? base.name,
        description: fields.description ?? base.description,
        detailDescription: fields.detailDescription ?? base.detailDescription,
        location: fields.location ?? base.location,
        badgeText: fields.badgeText ?? base.badgeText,
        address: fields.address ?? base.address,
        businessHours: fields.businessHours ?? base.businessHours,
        contact: fields.contact ?? base.contact,
        tags: fields.tagsText ? fields.tagsText.split(/\r?\n/).filter(Boolean) : base.tags,
        stats: fields.statsText
          ? fields.statsText.split(/\r?\n/).map((line) => {
              const [label = '', value = ''] = line.split('|||');
              return { label: label.trim(), value: value.trim() };
            })
          : base.stats,
        cooperationInfo: fields.cooperationInfoText
          ? fields.cooperationInfoText.split(/\r?\n/).map((line) => {
              const [label = '', value = ''] = line.split('|||');
              return { label: label.trim(), value: value.trim() };
            })
          : base.cooperationInfo,
      }),
      insert: async (values) => {
        await db!.insert(partnerCenterTranslations).values(values as typeof partnerCenterTranslations.$inferInsert);
      },
      update: async (id, values) => {
        await db!.update(partnerCenterTranslations)
          .set(values as Partial<typeof partnerCenterTranslations.$inferInsert>)
          .where(eq(partnerCenterTranslations.id, id));
      },
    });
  }
}

async function runSummits() {
  if (!shouldRun('summit')) return;
  log('\n=== 行业峰会 summits ===');
  const textKeys = [
    'title', 'description', 'detailDescription', 'scale', 'duration',
    'location', 'address', 'transportation', 'stats', 'speakers', 'sponsors',
  ];
  const [parents, all] = await Promise.all([
    db!.select().from(summits),
    db!.select().from(summitTranslations),
  ]);
  const byParent = new Map<string, RowLike[]>();
  for (const row of all) {
    const list = byParent.get(row.summitId) ?? [];
    list.push(row as unknown as RowLike);
    byParent.set(row.summitId, list);
  }

  for (const parent of parents) {
    const rows = byParent.get(parent.id) ?? [];
    if (rows.length) {
      await translateTranslationGroup({
        module: 'summit',
        entity: parent.slug,
        parentKey: 'summitId',
        parentId: parent.id,
        textKeys,
        rows,
        contentType: 'summit',
        toTranslateFields: (row) => ({
          title: String(row.title ?? ''),
          description: String(row.description ?? ''),
          detailDescription: String(row.detailDescription ?? ''),
          scale: String(row.scale ?? ''),
          duration: String(row.duration ?? ''),
          location: String(row.location ?? ''),
          address: String(row.address ?? ''),
          transportation: String(row.transportation ?? ''),
          statsText: Array.isArray(row.stats)
            ? (row.stats as Array<{ label: string; value: string }>).map((item) => `${item.label}|||${item.value}`).join('\n')
            : '',
          speakersText: Array.isArray(row.speakers)
            ? (row.speakers as Array<Record<string, string>>).map((item) =>
              [item.name, item.bio, item.expertise, item.region, item.badgeText, item.description].join('|||')).join('\n')
            : '',
          sponsorsText: Array.isArray(row.sponsors)
            ? (row.sponsors as Array<Record<string, string>>).map((item) =>
              [item.name, item.badgeText, item.intro].join('|||')).join('\n')
            : '',
        }),
        fromTranslateFields: (fields, base) => {
          const nextSpeakers = Array.isArray(base.speakers) ? cloneJson(base.speakers) as Array<Record<string, string>> : [];
          if (fields.speakersText) {
            fields.speakersText.split(/\r?\n/).forEach((line, index) => {
              if (!nextSpeakers[index]) return;
              const [name, bio, expertise, region, badgeText, description] = line.split('|||');
              Object.assign(nextSpeakers[index]!, {
                name: name ?? nextSpeakers[index]!.name,
                bio: bio ?? nextSpeakers[index]!.bio,
                expertise: expertise ?? nextSpeakers[index]!.expertise,
                region: region ?? nextSpeakers[index]!.region,
                badgeText: badgeText ?? nextSpeakers[index]!.badgeText,
                description: description ?? nextSpeakers[index]!.description,
              });
            });
          }
          const nextSponsors = Array.isArray(base.sponsors) ? cloneJson(base.sponsors) as Array<Record<string, string>> : [];
          if (fields.sponsorsText) {
            fields.sponsorsText.split(/\r?\n/).forEach((line, index) => {
              if (!nextSponsors[index]) return;
              const [name, badgeText, intro] = line.split('|||');
              Object.assign(nextSponsors[index]!, {
                name: name ?? nextSponsors[index]!.name,
                badgeText: badgeText ?? nextSponsors[index]!.badgeText,
                intro: intro ?? nextSponsors[index]!.intro,
              });
            });
          }
          return {
            title: fields.title ?? base.title,
            description: fields.description ?? base.description,
            detailDescription: fields.detailDescription ?? base.detailDescription,
            scale: fields.scale ?? base.scale,
            duration: fields.duration ?? base.duration,
            location: fields.location ?? base.location,
            address: fields.address ?? base.address,
            transportation: fields.transportation ?? base.transportation,
            stats: fields.statsText
              ? fields.statsText.split(/\r?\n/).map((line) => {
                  const [label = '', value = ''] = line.split('|||');
                  return { label: label.trim(), value: value.trim() };
                })
              : base.stats,
            speakers: nextSpeakers,
            sponsors: nextSponsors,
          };
        },
        insert: async (values) => {
          await db!.insert(summitTranslations).values(values as typeof summitTranslations.$inferInsert);
        },
        update: async (id, values) => {
          await db!.update(summitTranslations)
            .set(values as Partial<typeof summitTranslations.$inferInsert>)
            .where(eq(summitTranslations.id, id));
        },
      });
    }

    const agenda = Array.isArray(parent.agenda) ? cloneJson(parent.agenda) as Array<Record<string, unknown>> : [];
    let agendaChanged = false;
    for (let gi = 0; gi < agenda.length; gi += 1) {
      const group = agenda[gi]!;
      if (group.locales && typeof group.locales === 'object') {
        const result = await translateLocalesMap({
          module: 'summit',
          entity: `${parent.slug}#agendaGroup${gi}`,
          locales: group.locales as LocalesMap,
          contentType: 'summitAgendaGroup',
          fieldKeys: ['dayLabel', 'groupTitle'],
        });
        group.locales = result.locales;
        agendaChanged = agendaChanged || result.changed;
      }
      const items = Array.isArray(group.items) ? group.items as Array<Record<string, unknown>> : [];
      for (let ii = 0; ii < items.length; ii += 1) {
        const item = items[ii]!;
        if (item.locales && typeof item.locales === 'object') {
          const result = await translateLocalesMap({
            module: 'summit',
            entity: `${parent.slug}#agendaGroup${gi}.item${ii}`,
            locales: item.locales as LocalesMap,
            contentType: 'summitAgendaItem',
            fieldKeys: ['title', 'desc', 'speaker'],
          });
          item.locales = result.locales;
          agendaChanged = agendaChanged || result.changed;
        }
      }
    }
    if (agendaChanged && !DRY_RUN) {
      await db!.update(summits).set({ agenda, updatedAt: new Date() }).where(eq(summits.id, parent.id));
    }
  }
}

async function runCompanyProfile() {
  if (!shouldRun('companyProfile')) return;
  log('\n=== 企业信息 company profile ===');
  const textKeys = [
    'companyName', 'slogan', 'positioning', 'copyright', 'contactPhone', 'address',
    'businessHours', 'businessHotline', 'basicInfo', 'executives', 'managers', 'offices',
  ];
  const [parents, all] = await Promise.all([
    db!.select({ id: companyProfiles.id }).from(companyProfiles),
    db!.select().from(companyProfileTranslations),
  ]);
  const byParent = new Map<string, RowLike[]>();
  for (const row of all) {
    const list = byParent.get(row.profileId) ?? [];
    list.push(row as unknown as RowLike);
    byParent.set(row.profileId, list);
  }

  for (const parent of parents) {
    const rows = byParent.get(parent.id) ?? [];
    if (!rows.length) continue;
    await translateTranslationGroup({
      module: 'companyProfile',
      entity: parent.id.slice(0, 8),
      parentKey: 'profileId',
      parentId: parent.id,
      textKeys,
      rows,
      contentType: 'companyProfile',
      toTranslateFields: (row) => ({
        companyName: String(row.companyName ?? ''),
        slogan: String(row.slogan ?? ''),
        positioning: String(row.positioning ?? ''),
        copyright: String(row.copyright ?? ''),
        contactPhone: String(row.contactPhone ?? ''),
        address: String(row.address ?? ''),
        businessHours: String(row.businessHours ?? ''),
        businessHotline: String(row.businessHotline ?? ''),
        basicInfoText: Array.isArray(row.basicInfo)
          ? (row.basicInfo as Array<{ label: string; value: string }>).map((item) => `${item.label}|||${item.value}`).join('\n')
          : '',
        executivesText: Array.isArray(row.executives)
          ? (row.executives as Array<{ title: string; name: string }>).map((item) => `${item.title}|||${item.name}`).join('\n')
          : '',
        managersText: Array.isArray(row.managers)
          ? (row.managers as Array<{ title: string; name: string }>).map((item) => `${item.title}|||${item.name}`).join('\n')
          : '',
        officesText: Array.isArray(row.offices)
          ? (row.offices as Array<Record<string, string>>).map((item) =>
            [item.name, item.location, item.phone, item.contactPerson, item.email].join('|||')).join('\n')
          : '',
      }),
      fromTranslateFields: (fields, base) => {
        const offices = Array.isArray(base.offices) ? cloneJson(base.offices) as Array<Record<string, string>> : [];
        if (fields.officesText) {
          fields.officesText.split(/\r?\n/).forEach((line, index) => {
            if (!offices[index]) return;
            const [name, location, phone, contactPerson, email] = line.split('|||');
            Object.assign(offices[index]!, {
              name: name ?? offices[index]!.name,
              location: location ?? offices[index]!.location,
              phone: phone ?? offices[index]!.phone,
              contactPerson: contactPerson ?? offices[index]!.contactPerson,
              email: email ?? offices[index]!.email,
            });
          });
        }
        return {
          companyName: fields.companyName ?? base.companyName,
          slogan: fields.slogan ?? base.slogan,
          positioning: fields.positioning ?? base.positioning,
          copyright: fields.copyright ?? base.copyright,
          contactPhone: fields.contactPhone ?? base.contactPhone,
          address: fields.address ?? base.address,
          businessHours: fields.businessHours ?? base.businessHours,
          businessHotline: fields.businessHotline ?? base.businessHotline,
          basicInfo: fields.basicInfoText
            ? fields.basicInfoText.split(/\r?\n/).map((line) => {
                const [label = '', value = ''] = line.split('|||');
                return { label: label.trim(), value: value.trim() };
              })
            : base.basicInfo,
          executives: fields.executivesText
            ? fields.executivesText.split(/\r?\n/).map((line) => {
                const [title = '', name = ''] = line.split('|||');
                return { title: title.trim(), name: name.trim() };
              })
            : base.executives,
          managers: fields.managersText
            ? fields.managersText.split(/\r?\n/).map((line) => {
                const [title = '', name = ''] = line.split('|||');
                return { title: title.trim(), name: name.trim() };
              })
            : base.managers,
          offices,
        };
      },
      insert: async (values) => {
        await db!.insert(companyProfileTranslations).values(values as typeof companyProfileTranslations.$inferInsert);
      },
      update: async (id, values) => {
        await db!.update(companyProfileTranslations)
          .set(values as Partial<typeof companyProfileTranslations.$inferInsert>)
          .where(eq(companyProfileTranslations.id, id));
      },
    });
  }
}

async function runSocialMedia() {
  if (!shouldRun('socialMedia')) return;
  log('\n=== 社交媒体 social media ===');
  const textKeys = ['featuredPosts'];
  const [parents, all] = await Promise.all([
    db!.select({ id: socialMediaProfiles.id }).from(socialMediaProfiles),
    db!.select().from(socialMediaProfileTranslations),
  ]);
  const byParent = new Map<string, RowLike[]>();
  for (const row of all) {
    const list = byParent.get(row.profileId) ?? [];
    list.push(row as unknown as RowLike);
    byParent.set(row.profileId, list);
  }

  for (const parent of parents) {
    const rows = byParent.get(parent.id) ?? [];
    if (!rows.length) continue;
    await translateTranslationGroup({
      module: 'socialMedia',
      entity: parent.id.slice(0, 8),
      parentKey: 'profileId',
      parentId: parent.id,
      textKeys,
      rows,
      contentType: 'socialMedia',
      toTranslateFields: (row) => ({
        featuredPostsText: Array.isArray(row.featuredPosts)
          ? (row.featuredPosts as Array<Record<string, string>>).map((item) =>
            [item.badgeText ?? '', item.title ?? '', item.description ?? ''].join('|||')).join('\n')
          : '',
      }),
      fromTranslateFields: (fields, base) => {
        const posts = Array.isArray(base.featuredPosts) ? cloneJson(base.featuredPosts) as Array<Record<string, string>> : [];
        if (fields.featuredPostsText) {
          fields.featuredPostsText.split(/\r?\n/).forEach((line, index) => {
            if (!posts[index]) return;
            const [badgeText, title, description] = line.split('|||');
            Object.assign(posts[index]!, {
              badgeText: badgeText ?? posts[index]!.badgeText,
              title: title ?? posts[index]!.title,
              description: description ?? posts[index]!.description,
              // keep coverImage / url from English source
            });
          });
        }
        return { featuredPosts: posts };
      },
      insert: async (values) => {
        await db!.insert(socialMediaProfileTranslations).values(values as typeof socialMediaProfileTranslations.$inferInsert);
      },
      update: async (id, values) => {
        await db!.update(socialMediaProfileTranslations)
          .set(values as Partial<typeof socialMediaProfileTranslations.$inferInsert>)
          .where(eq(socialMediaProfileTranslations.id, id));
      },
    });
  }
}

async function runHomepage() {
  if (!shouldRun('homepageConfig')) return;
  log('\n=== 首页配置 homepage ===');
  const textKeys = [
    'bannerTitle', 'bannerSubtitle', 'bannerDescription',
    'solutionsTitle', 'solutionsDescription',
    'aboutTitle', 'aboutDescription',
    'stats', 'globalTitle', 'globalDescription',
    'educationTitle', 'educationDescription', 'educationItems',
  ];
  const [parents, all] = await Promise.all([
    db!.select({ id: homepageConfigs.id }).from(homepageConfigs),
    db!.select().from(homepageConfigTranslations),
  ]);
  const byParent = new Map<string, RowLike[]>();
  for (const row of all) {
    const list = byParent.get(row.configId) ?? [];
    list.push(row as unknown as RowLike);
    byParent.set(row.configId, list);
  }

  for (const parent of parents) {
    const rows = byParent.get(parent.id) ?? [];
    if (!rows.length) continue;
    await translateTranslationGroup({
      module: 'homepageConfig',
      entity: parent.id.slice(0, 8),
      parentKey: 'configId',
      parentId: parent.id,
      textKeys,
      rows,
      contentType: 'homepageConfig',
      toTranslateFields: (row) => ({
        bannerTitle: String(row.bannerTitle ?? ''),
        bannerSubtitle: String(row.bannerSubtitle ?? ''),
        bannerDescription: String(row.bannerDescription ?? ''),
        solutionsTitle: String(row.solutionsTitle ?? ''),
        solutionsDescription: String(row.solutionsDescription ?? ''),
        aboutTitle: String(row.aboutTitle ?? ''),
        aboutDescription: String(row.aboutDescription ?? ''),
        globalTitle: String(row.globalTitle ?? ''),
        globalDescription: String(row.globalDescription ?? ''),
        educationTitle: String(row.educationTitle ?? ''),
        educationDescription: String(row.educationDescription ?? ''),
        statsText: Array.isArray(row.stats)
          ? (row.stats as Array<{ title?: string; subtitle?: string; description?: string }>).map((item) =>
            [item.title ?? '', item.subtitle ?? '', item.description ?? ''].join('|||')).join('\n')
          : '',
        educationText: Array.isArray(row.educationItems)
          ? (row.educationItems as Array<Record<string, string>>).map((item) =>
            [item.title ?? '', item.description ?? '', item.badgeText ?? '', item.extraText ?? ''].join('|||')).join('\n')
          : '',
      }),
      fromTranslateFields: (fields, base) => {
        const stats = Array.isArray(base.stats) ? cloneJson(base.stats) as Array<Record<string, string>> : [];
        if (fields.statsText) {
          fields.statsText.split(/\r?\n/).forEach((line, index) => {
            if (!stats[index]) return;
            const [title, subtitle, description] = line.split('|||');
            Object.assign(stats[index]!, {
              title: title ?? stats[index]!.title,
              subtitle: subtitle ?? stats[index]!.subtitle,
              description: description ?? stats[index]!.description,
            });
          });
        }
        const educationItems = Array.isArray(base.educationItems)
          ? cloneJson(base.educationItems) as Array<Record<string, string>>
          : [];
        if (fields.educationText) {
          fields.educationText.split(/\r?\n/).forEach((line, index) => {
            if (!educationItems[index]) return;
            const [title, description, badgeText, extraText] = line.split('|||');
            Object.assign(educationItems[index]!, {
              title: title ?? educationItems[index]!.title,
              description: description ?? educationItems[index]!.description,
              badgeText: badgeText ?? educationItems[index]!.badgeText,
              extraText: extraText ?? educationItems[index]!.extraText,
            });
          });
        }
        return {
          bannerTitle: fields.bannerTitle ?? base.bannerTitle,
          bannerSubtitle: fields.bannerSubtitle ?? base.bannerSubtitle,
          bannerDescription: fields.bannerDescription ?? base.bannerDescription,
          solutionsTitle: fields.solutionsTitle ?? base.solutionsTitle,
          solutionsDescription: fields.solutionsDescription ?? base.solutionsDescription,
          aboutTitle: fields.aboutTitle ?? base.aboutTitle,
          aboutDescription: fields.aboutDescription ?? base.aboutDescription,
          globalTitle: fields.globalTitle ?? base.globalTitle,
          globalDescription: fields.globalDescription ?? base.globalDescription,
          educationTitle: fields.educationTitle ?? base.educationTitle,
          educationDescription: fields.educationDescription ?? base.educationDescription,
          stats,
          educationItems,
        };
      },
      insert: async (values) => {
        await db!.insert(homepageConfigTranslations).values(values as typeof homepageConfigTranslations.$inferInsert);
      },
      update: async (id, values) => {
        await db!.update(homepageConfigTranslations)
          .set(values as Partial<typeof homepageConfigTranslations.$inferInsert>)
          .where(eq(homepageConfigTranslations.id, id));
      },
    });
  }
}

async function runWebsiteNav() {
  if (!shouldRun('websiteConfig')) return;
  log('\n=== 网站配置 website nav ===');
  const configs = await db!.select().from(websiteConfigs);
  for (const config of configs) {
    const columns = cloneJson(config.navColumns ?? []) as Array<Record<string, unknown>>;
    let changed = false;

    for (let ci = 0; ci < columns.length; ci += 1) {
      const column = columns[ci]!;
      const colLocales = (column.locales && typeof column.locales === 'object')
        ? cloneJson(column.locales) as LocalesMap
        : {};
      const colResult = await translateNavNameNode({
        module: 'websiteConfig',
        entity: `col:${String(column.id ?? ci)}`,
        name: String(column.name ?? ''),
        locales: colLocales,
        contentType: 'websiteNavColumn',
      });
      column.name = colResult.name;
      column.locales = colResult.locales;
      changed = changed || colResult.changed;

      const items = Array.isArray(column.items) ? column.items as Array<Record<string, unknown>> : [];
      for (let ii = 0; ii < items.length; ii += 1) {
        const item = items[ii]!;
        const itemLocales = (item.locales && typeof item.locales === 'object')
          ? cloneJson(item.locales) as LocalesMap
          : {};
        const itemResult = await translateNavNameNode({
          module: 'websiteConfig',
          entity: `col:${String(column.id ?? ci)}.item:${String(item.id ?? ii)}`,
          name: String(item.name ?? ''),
          locales: itemLocales,
          contentType: 'websiteNavItem',
        });
        item.name = itemResult.name;
        item.locales = itemResult.locales;
        changed = changed || itemResult.changed;
      }
    }

    if (changed && !DRY_RUN) {
      await db!.update(websiteConfigs)
        .set({ navColumns: columns as never, updatedAt: new Date() })
        .where(eq(websiteConfigs.id, config.id));
      record({ module: 'websiteConfig', entity: config.id.slice(0, 8), action: 'updated-nav' });
    }
  }
}

async function runBlogs() {
  if (!shouldRun('blog')) return;
  log('\n=== 博客 editorial ===');
  const textKeys = ['title', 'summary', 'seoTitle', 'seoDescription', 'payload'];
  const [parents, all] = await Promise.all([
    db!.select({ id: editorialContents.id, contentModule: editorialContents.contentModule })
      .from(editorialContents)
      .where(eq(editorialContents.contentModule, 'editorial')),
    db!.select().from(editorialContentTranslations),
  ]);
  const parentIds = new Set(parents.map((item) => item.id));
  const byParent = new Map<string, RowLike[]>();
  for (const row of all) {
    if (!parentIds.has(row.contentId)) continue;
    const list = byParent.get(row.contentId) ?? [];
    list.push(row as unknown as RowLike);
    byParent.set(row.contentId, list);
  }

  for (const parent of parents) {
    const rows = byParent.get(parent.id) ?? [];
    if (!rows.length) continue;
    const label = String(
      pickPreferredLocaleRow(rows, 'en')?.title
        ?? pickPreferredLocaleRow(rows, 'zh')?.title
        ?? parent.id.slice(0, 8),
    );
    await translateTranslationGroup({
      module: 'blog',
      entity: label.slice(0, 60),
      parentKey: 'contentId',
      parentId: parent.id,
      textKeys,
      rows,
      contentType: 'blog',
      toTranslateFields: (row) => {
        const payload = (row.payload ?? {}) as Record<string, unknown>;
        return {
          title: String(row.title ?? ''),
          summary: String(row.summary ?? ''),
          body: String(payload.body ?? ''),
          authorName: String(payload.authorName ?? ''),
          authorTitle: String(payload.authorTitle ?? ''),
          authorBio: String(payload.authorBio ?? ''),
          category: String(payload.category ?? ''),
          tagsText: Array.isArray(payload.tags) ? (payload.tags as string[]).join('\n') : '',
          seoTitle: String(row.seoTitle ?? ''),
          seoDescription: String(row.seoDescription ?? ''),
        };
      },
      fromTranslateFields: (fields, base) => {
        const payload = cloneJson((base.payload ?? {}) as Record<string, unknown>);
        if (fields.body) payload.body = fields.body;
        if (fields.authorName) payload.authorName = fields.authorName;
        if (fields.authorTitle) payload.authorTitle = fields.authorTitle;
        if (fields.authorBio) payload.authorBio = fields.authorBio;
        if (fields.category) payload.category = fields.category;
        if (fields.tagsText) {
          payload.tags = fields.tagsText.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
        }
        return {
          title: fields.title ?? base.title,
          summary: fields.summary ?? base.summary,
          seoTitle: fields.seoTitle ?? base.seoTitle,
          seoDescription: fields.seoDescription ?? base.seoDescription,
          payload,
        };
      },
      insert: async (values) => {
        await db!.insert(editorialContentTranslations).values({
          ...(values as typeof editorialContentTranslations.$inferInsert),
          contentModule: 'editorial',
        });
      },
      update: async (id, values) => {
        await db!.update(editorialContentTranslations)
          .set(values as Partial<typeof editorialContentTranslations.$inferInsert>)
          .where(eq(editorialContentTranslations.id, id));
      },
      prepareInsert: async (values, locale) => {
        const title = String(values.title ?? 'post');
        const slug = await resolveUniqueEditorialSlug(title, locale, parent.id);
        return { ...values, slug, locale, contentModule: 'editorial' };
      },
    });
  }
}

async function coverageSummary() {
  log('\n=== 覆盖率摘要 ===');

  async function countLocales(
    label: string,
    rows: Array<{ locale: string } & Record<string, unknown>>,
    parentKey: string,
    textKeys: string[],
  ) {
    const byParent = new Map<string, typeof rows>();
    for (const row of rows) {
      const id = String(row[parentKey]);
      const list = byParent.get(id) ?? [];
      list.push(row);
      byParent.set(id, list);
    }
    let withEn = 0;
    let withZh = 0;
    let withEs = 0;
    for (const [, group] of byParent) {
      const en = pickPreferredLocaleRow(group as RowLike[], 'en');
      const zh = pickPreferredLocaleRow(group as RowLike[], 'zh');
      const es = pickEsRow(group as RowLike[]);
      if (rowHasText(en, textKeys)) withEn += 1;
      if (rowHasText(zh, textKeys)) withZh += 1;
      if (rowHasText(es, textKeys)) withEs += 1;
    }
    log(`  ${label}: entities=${byParent.size} en=${withEn} zh=${withZh} es=${withEs}`);
  }

  await countLocales('product', await db!.select().from(productTranslations), 'productId', [
    'name', 'shortDescription', 'description',
  ]);
  await countLocales('brandNarrative', await db!.select().from(brandNarrativeTranslations), 'narrativeId', [
    'title', 'largeTitle', 'description',
  ]);
  await countLocales('solution', await db!.select().from(solutionTranslations), 'solutionId', [
    'title', 'largeTitle', 'description',
  ]);
  await countLocales('surgeon', await db!.select().from(surgeonTranslations), 'surgeonId', [
    'name', 'position', 'detailDescription',
  ]);
  await countLocales('partnerCenter', await db!.select().from(partnerCenterTranslations), 'centerId', [
    'name', 'description',
  ]);
  await countLocales('summit', await db!.select().from(summitTranslations), 'summitId', [
    'title', 'description',
  ]);
  await countLocales('companyProfile', await db!.select().from(companyProfileTranslations), 'profileId', [
    'companyName', 'slogan',
  ]);
  await countLocales('homepageConfig', await db!.select().from(homepageConfigTranslations), 'configId', [
    'bannerTitle', 'aboutTitle',
  ]);
  await countLocales('socialMedia', await db!.select().from(socialMediaProfileTranslations), 'profileId', [
    'featuredPosts',
  ]);
  const blogs = await db!.select().from(editorialContentTranslations);
  const editorialIds = new Set(
    (await db!.select({ id: editorialContents.id }).from(editorialContents)
      .where(eq(editorialContents.contentModule, 'editorial'))).map((item) => item.id),
  );
  await countLocales(
    'blog',
    blogs.filter((row) => editorialIds.has(row.contentId)),
    'contentId',
    ['title', 'summary'],
  );
}

async function main() {
  log(`translate-content-from-en 开始 ${new Date().toISOString()} dryRun=${DRY_RUN} targets=${[...TARGETS].join(',')}`);
  if (ONLY_MODULES) log(`仅模块: ${[...ONLY_MODULES].join(', ')}`);

  await runProducts();
  await runBrandNarratives();
  await runSolutions();
  await runSurgeons();
  await runPartnerCenters();
  await runSummits();
  await runCompanyProfile();
  await runSocialMedia();
  await runHomepage();
  await runWebsiteNav();
  await runBlogs();

  await coverageSummary();

  log('\n=== 摘要 ===');
  log(JSON.stringify(summary, null, 2));

  const cacheDir = join(process.cwd(), 'scripts', '.cache');
  mkdirSync(cacheDir, { recursive: true });
  const logPath = join(cacheDir, `translate-content-from-en-${nowIso()}.log`);
  writeFileSync(logPath, logLines.join('\n'), 'utf8');
  log(`日志已写入 ${logPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
