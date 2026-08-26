/**
 * Fix CMS locale mismatches (zh↔en) and ensure English translations exist.
 *
 * Usage:
 *   pnpm exec tsx scripts/fix-content-locales.ts
 *   pnpm exec tsx scripts/fix-content-locales.ts --dry-run
 *   pnpm exec tsx scripts/fix-content-locales.ts --modules=product,surgeon
 *   pnpm exec tsx scripts/fix-content-locales.ts --delay-ms=300
 */
import '@/lib/env';

import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

import { eq } from 'drizzle-orm';

import { translateContentFields } from '@/server/ai/translate';
import type { ContentTranslateType } from '@/lib/content-translate-config';
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
  decidePairAction,
  detectLang,
  isEnLocale,
  isZhLocale,
  normalizeFamily,
  pickPreferredLocaleRow,
  sleep,
  type LangKind,
  type PairAction,
} from './lib/locale-detect';

if (!db) {
  throw new Error('DATABASE_URL is required');
}

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

type LogAction = {
  module: string;
  entity: string;
  action: string;
  detail?: string;
};

const logLines: string[] = [];
const summary = {
  swapped: 0,
  moved: 0,
  translated: 0,
  retranslated: 0,
  skipped: 0,
  failed: 0,
  ok: 0,
};

function log(line: string) {
  console.log(line);
  logLines.push(line);
}

function record(entry: LogAction) {
  const line = `[${entry.module}] ${entry.entity} → ${entry.action}${entry.detail ? ` (${entry.detail})` : ''}`;
  log(line);
}

function shouldRun(module: string) {
  return !ONLY_MODULES || ONLY_MODULES.has(module);
}

function nowIso() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function joinStats(stats: Array<{ label?: string; value?: string }> | null | undefined) {
  if (!Array.isArray(stats)) return '';
  return stats.map((item) => `${item.label ?? ''} ${item.value ?? ''}`).join(' ');
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function textFromLocalesCopy(copy: Record<string, unknown> | null | undefined) {
  if (!copy) return '';
  const keys = [
    'smallTitle', 'largeTitle', 'description', 'buttonLabel', 'badge',
    'totalHours', 'teachingFormat', 'trainingCycle',
    'dayLabel', 'groupTitle', 'title', 'desc', 'speaker',
    'name',
  ];
  return collectText(keys.map((key) => copy[key]));
}

async function translateFlatFields(
  contentType: ContentTranslateType,
  fields: Record<string, string>,
): Promise<Record<string, string>> {
  const nonempty: Record<string, string> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value?.trim()) nonempty[key] = value;
  }
  if (!Object.keys(nonempty).length) return {};
  return translateContentFields({
    contentType,
    sourceLocale: CANONICAL_ZH,
    targetLocale: CANONICAL_EN,
    fields: nonempty,
  });
}

/* ───── Generic i18n pair repair for plain rows ───── */

type RowLike = {
  id: string;
  locale: string;
  [key: string]: unknown;
};

function rowLang(row: RowLike | null, textKeys: string[]): LangKind {
  if (!row) return 'empty';
  const text = collectText(textKeys.map((key) => row[key]));
  return detectLang(text);
}

function pickTextPayload(row: RowLike, textKeys: string[]): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  for (const key of textKeys) {
    payload[key] = cloneJson(row[key]);
  }
  return payload;
}

function applyTextPayload(row: RowLike, payload: Record<string, unknown>, textKeys: string[]) {
  for (const key of textKeys) {
    if (key in payload) row[key] = cloneJson(payload[key]);
  }
}

async function upsertLocaleRow(options: {
  module: string;
  entity: string;
  parentKey: string;
  parentId: string;
  locale: string;
  textKeys: string[];
  payload: Record<string, unknown>;
  existing: RowLike | null;
  allRows: RowLike[];
  insert: (values: Record<string, unknown>) => Promise<void>;
  update: (id: string, values: Record<string, unknown>) => Promise<void>;
  templateRow?: RowLike | null;
}) {
  const {
    module, entity, parentKey, parentId, locale, textKeys, payload,
    existing, insert, update, templateRow,
  } = options;

  if (DRY_RUN) {
    record({ module, entity, action: existing ? `dry-update:${locale}` : `dry-insert:${locale}` });
    return;
  }

  if (existing) {
    const patch: Record<string, unknown> = { updatedAt: new Date() };
    for (const key of textKeys) {
      if (key in payload) patch[key] = payload[key];
    }
    await update(existing.id, patch);
    applyTextPayload(existing, payload, textKeys);
    existing.locale = locale;
  } else {
    const base = templateRow ? cloneJson(templateRow) : {};
    delete (base as { id?: string }).id;
    const values: Record<string, unknown> = {
      ...base,
      [parentKey]: parentId,
      locale,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    for (const key of textKeys) {
      if (key in payload) values[key] = payload[key];
    }
    await insert(values);
    options.allRows.push({ id: 'new', locale, ...values } as RowLike);
  }
}

async function clearLocaleText(options: {
  row: RowLike;
  textKeys: string[];
  update: (id: string, values: Record<string, unknown>) => Promise<void>;
}) {
  const empty: Record<string, unknown> = { updatedAt: new Date() };
  for (const key of options.textKeys) {
    const current = options.row[key];
    if (typeof current === 'string') empty[key] = '';
    else if (Array.isArray(current)) empty[key] = [];
    else if (current && typeof current === 'object') empty[key] = Array.isArray(current) ? [] : current;
  }
  if (!DRY_RUN) {
    await options.update(options.row.id, empty);
  }
  applyTextPayload(options.row, empty, options.textKeys);
}

async function repairTranslationGroup(options: {
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
}) {
  const {
    module, entity, parentKey, parentId, textKeys, rows, contentType,
    toTranslateFields, fromTranslateFields, insert, update,
  } = options;

  let zhRow = pickPreferredLocaleRow(rows, 'zh');
  let enRow = pickPreferredLocaleRow(rows, 'en');
  let zhLang = rowLang(zhRow, textKeys);
  let enLang = rowLang(enRow, textKeys);
  let action = decidePairAction(zhLang, enLang);

  // Normalize stray locales into canonical rows when possible
  if (!zhRow && rows.some((row) => isZhLocale(row.locale))) {
    zhRow = pickPreferredLocaleRow(rows, 'zh');
  }
  if (!enRow && rows.some((row) => isEnLocale(row.locale))) {
    enRow = pickPreferredLocaleRow(rows, 'en');
  }

  zhLang = rowLang(zhRow, textKeys);
  enLang = rowLang(enRow, textKeys);
  action = decidePairAction(zhLang, enLang);

  try {
    if (action === 'swap' && zhRow && enRow) {
      const zhPayload = pickTextPayload(zhRow, textKeys);
      const enPayload = pickTextPayload(enRow, textKeys);
      await upsertLocaleRow({
        module, entity, parentKey, parentId, locale: zhRow.locale || CANONICAL_ZH,
        textKeys, payload: enPayload, existing: zhRow, allRows: rows, insert, update,
      });
      await upsertLocaleRow({
        module, entity, parentKey, parentId, locale: enRow.locale || CANONICAL_EN,
        textKeys, payload: zhPayload, existing: enRow, allRows: rows, insert, update,
      });
      summary.swapped += 1;
      record({ module, entity, action: 'swap' });
    } else if (action === 'move_en_to_zh' && enRow) {
      const enPayload = pickTextPayload(enRow, textKeys);
      if (zhRow) {
        await upsertLocaleRow({
          module, entity, parentKey, parentId, locale: CANONICAL_ZH,
          textKeys, payload: enPayload, existing: zhRow, allRows: rows, insert, update, templateRow: enRow,
        });
      } else if (enRow.locale === CANONICAL_ZH || isZhLocale(enRow.locale)) {
        // already zh locale somehow
      } else {
        // Re-key: write zh-CN from en content, then clear en for Phase B translate
        await upsertLocaleRow({
          module, entity, parentKey, parentId, locale: CANONICAL_ZH,
          textKeys, payload: enPayload, existing: null, allRows: rows, insert, update, templateRow: enRow,
        });
        zhRow = pickPreferredLocaleRow(rows, 'zh');
      }
      // Keep en row but mark for retranslate by clearing text (then Phase B)
      await clearLocaleText({ row: enRow, textKeys, update });
      summary.moved += 1;
      record({ module, entity, action: 'move_en_to_zh' });
      action = 'translate_en';
      zhRow = pickPreferredLocaleRow(rows, 'zh');
      enRow = pickPreferredLocaleRow(rows, 'en');
      zhLang = rowLang(zhRow, textKeys);
      enLang = rowLang(enRow, textKeys);
    } else if (action === 'move_zh_to_en' && zhRow) {
      const zhPayload = pickTextPayload(zhRow, textKeys);
      await upsertLocaleRow({
        module, entity, parentKey, parentId, locale: CANONICAL_EN,
        textKeys, payload: zhPayload, existing: enRow, allRows: rows, insert, update, templateRow: zhRow,
      });
      await clearLocaleText({ row: zhRow, textKeys, update });
      summary.moved += 1;
      record({ module, entity, action: 'move_zh_to_en' });
      zhRow = pickPreferredLocaleRow(rows, 'zh');
      enRow = pickPreferredLocaleRow(rows, 'en');
      zhLang = rowLang(zhRow, textKeys);
      enLang = rowLang(enRow, textKeys);
      action = decidePairAction(zhLang, enLang);
    } else if (action === 'ok') {
      summary.ok += 1;
    } else if (action === 'skip') {
      summary.skipped += 1;
    }

    // Ensure canonical en exists when zh has content
    zhRow = pickPreferredLocaleRow(rows, 'zh');
    enRow = pickPreferredLocaleRow(rows, 'en');
    zhLang = rowLang(zhRow, textKeys);
    enLang = rowLang(enRow, textKeys);
    const needsEn = (zhLang === 'zh' || zhLang === 'mixed')
      && !(enLang === 'en' || enLang === 'mixed');

    if ((action === 'retranslate_en' || action === 'translate_en' || needsEn) && zhRow) {
      if (DRY_RUN) {
        record({ module, entity, action: 'dry-translate_en' });
        summary.translated += 1;
        return;
      }
      const sourceFields = toTranslateFields(zhRow);
      const translated = await translateFlatFields(contentType, sourceFields);
      const payload = fromTranslateFields(translated, zhRow);
      // Preserve non-text structural fields from zh when creating en
      const merged = { ...pickTextPayload(zhRow, textKeys), ...payload };
      await upsertLocaleRow({
        module, entity, parentKey, parentId, locale: CANONICAL_EN,
        textKeys, payload: merged, existing: enRow && isEnLocale(enRow.locale) ? enRow : null,
        allRows: rows, insert, update, templateRow: zhRow,
      });
      if (action === 'retranslate_en') summary.retranslated += 1;
      else summary.translated += 1;
      record({ module, entity, action: action === 'retranslate_en' ? 'retranslate_en' : 'translate_en' });
      await sleep(delayMs);
    }
  } catch (error) {
    summary.failed += 1;
    const message = error instanceof Error ? error.message : String(error);
    record({ module, entity, action: 'failed', detail: message });
  }
}

/* ───── JSON locales map repair (blocks / agenda) ───── */

type LocalesMap = Record<string, Record<string, unknown>>;

function pickLocaleCopy(locales: LocalesMap | undefined, family: 'zh' | 'en') {
  if (!locales) return { key: null as string | null, copy: null as Record<string, unknown> | null };
  const entries = Object.entries(locales).filter(([code]) => normalizeFamily(code) === family);
  if (!entries.length) return { key: null, copy: null };
  const preferred = family === 'zh' ? CANONICAL_ZH : CANONICAL_EN;
  const hit = entries.find(([code]) => code === preferred) ?? entries[0]!;
  return { key: hit[0], copy: hit[1] };
}

async function repairLocalesMap(options: {
  module: string;
  entity: string;
  locales: LocalesMap | undefined;
  contentType: ContentTranslateType;
  fieldKeys: string[];
}): Promise<{ locales: LocalesMap; changed: boolean }> {
  const locales: LocalesMap = cloneJson(options.locales ?? {});
  let changed = false;

  let zh = pickLocaleCopy(locales, 'zh');
  let en = pickLocaleCopy(locales, 'en');
  let zhLang = detectLang(textFromLocalesCopy(zh.copy ?? undefined));
  let enLang = detectLang(textFromLocalesCopy(en.copy ?? undefined));
  let action = decidePairAction(zhLang, enLang);

  const setCopy = (code: string, copy: Record<string, unknown> | null) => {
    if (!copy) {
      delete locales[code];
    } else {
      locales[code] = copy;
    }
    changed = true;
  };

  if (action === 'swap' && zh.copy && en.copy && zh.key && en.key) {
    const zhCopy = cloneJson(zh.copy);
    const enCopy = cloneJson(en.copy);
    setCopy(zh.key, enCopy);
    setCopy(en.key, zhCopy);
    record({ module: options.module, entity: options.entity, action: 'swap-locales' });
    summary.swapped += 1;
  } else if (action === 'move_en_to_zh' && en.copy) {
    setCopy(CANONICAL_ZH, cloneJson(en.copy));
    if (en.key) setCopy(en.key, null);
    record({ module: options.module, entity: options.entity, action: 'move_en_to_zh-locales' });
    summary.moved += 1;
    action = 'translate_en';
  } else if (action === 'move_zh_to_en' && zh.copy) {
    setCopy(CANONICAL_EN, cloneJson(zh.copy));
    if (zh.key) setCopy(zh.key, null);
    record({ module: options.module, entity: options.entity, action: 'move_zh_to_en-locales' });
    summary.moved += 1;
  }

  zh = pickLocaleCopy(locales, 'zh');
  en = pickLocaleCopy(locales, 'en');
  zhLang = detectLang(textFromLocalesCopy(zh.copy ?? undefined));
  enLang = detectLang(textFromLocalesCopy(en.copy ?? undefined));
  const needsEn = (zhLang === 'zh' || zhLang === 'mixed')
    && !(enLang === 'en' || enLang === 'mixed');

  if ((action === 'retranslate_en' || action === 'translate_en' || needsEn) && zh.copy) {
    if (DRY_RUN) {
      record({ module: options.module, entity: options.entity, action: 'dry-translate_en-locales' });
      summary.translated += 1;
      return { locales, changed: true };
    }
    const fields: Record<string, string> = {};
    for (const key of options.fieldKeys) {
      const value = zh.copy[key];
      if (typeof value === 'string' && value.trim()) fields[key] = value;
    }
    if (Object.keys(fields).length) {
      const translated = await translateFlatFields(options.contentType, fields);
      const next = { ...cloneJson(zh.copy), ...translated };
      setCopy(CANONICAL_EN, next);
      if (action === 'retranslate_en') summary.retranslated += 1;
      else summary.translated += 1;
      record({ module: options.module, entity: options.entity, action: 'translate_en-locales' });
      await sleep(delayMs);
    }
  }

  return { locales, changed };
}

async function repairBlocksTree(options: {
  module: string;
  entity: string;
  blocks: unknown[];
}): Promise<{ blocks: unknown[]; changed: boolean }> {
  const blocks = cloneJson(options.blocks);
  let changed = false;

  for (let i = 0; i < blocks.length; i += 1) {
    const block = blocks[i] as Record<string, unknown>;
    if (!block || typeof block !== 'object') continue;

    if (block.locales && typeof block.locales === 'object') {
      const result = await repairLocalesMap({
        module: options.module,
        entity: `${options.entity}#block${i}`,
        locales: block.locales as LocalesMap,
        contentType: options.module === 'solution' ? 'solutionBlock' : 'brandNarrativeBlock',
        fieldKeys: ['smallTitle', 'largeTitle', 'description', 'buttonLabel'],
      });
      block.locales = result.locales;
      changed = changed || result.changed;
    }

    const items = Array.isArray(block.items) ? block.items as Array<Record<string, unknown>> : [];
    for (let j = 0; j < items.length; j += 1) {
      const item = items[j]!;
      if (item.locales && typeof item.locales === 'object') {
        const result = await repairLocalesMap({
          module: options.module,
          entity: `${options.entity}#block${i}.item${j}`,
          locales: item.locales as LocalesMap,
          contentType: options.module === 'solution' ? 'solutionBlockItem' : 'brandNarrativeBlockItem',
          fieldKeys: ['smallTitle', 'largeTitle', 'description', 'badge', 'totalHours', 'teachingFormat', 'trainingCycle'],
        });
        item.locales = result.locales;
        changed = changed || result.changed;
      }
    }
  }

  return { blocks, changed };
}

/* ───── Module runners ───── */

async function fixSurgeons() {
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
    await repairTranslationGroup({
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
        await db!.update(surgeonTranslations).set(values as Partial<typeof surgeonTranslations.$inferInsert>).where(eq(surgeonTranslations.id, id));
      },
    });
  }
}

async function fixPartnerCenters() {
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
    await repairTranslationGroup({
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
        await db!.update(partnerCenterTranslations).set(values as Partial<typeof partnerCenterTranslations.$inferInsert>).where(eq(partnerCenterTranslations.id, id));
      },
    });
  }
}

async function fixSummits() {
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
      await repairTranslationGroup({
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
            const lines = fields.speakersText.split(/\r?\n/);
            lines.forEach((line, index) => {
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
            const lines = fields.sponsorsText.split(/\r?\n/);
            lines.forEach((line, index) => {
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
          await db!.update(summitTranslations).set(values as Partial<typeof summitTranslations.$inferInsert>).where(eq(summitTranslations.id, id));
        },
      });
    }

    // Agenda locales
    const agenda = Array.isArray(parent.agenda) ? cloneJson(parent.agenda) as Array<Record<string, unknown>> : [];
    let agendaChanged = false;
    for (let gi = 0; gi < agenda.length; gi += 1) {
      const group = agenda[gi]!;
      if (group.locales && typeof group.locales === 'object') {
        const result = await repairLocalesMap({
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
          const result = await repairLocalesMap({
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

async function fixCompanyProfile() {
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
    await repairTranslationGroup({
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
        await db!.update(companyProfileTranslations).set(values as Partial<typeof companyProfileTranslations.$inferInsert>).where(eq(companyProfileTranslations.id, id));
      },
    });
  }
}

async function fixSocialMedia() {
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
    await repairTranslationGroup({
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
            });
          });
        }
        return { featuredPosts: posts };
      },
      insert: async (values) => {
        await db!.insert(socialMediaProfileTranslations).values(values as typeof socialMediaProfileTranslations.$inferInsert);
      },
      update: async (id, values) => {
        await db!.update(socialMediaProfileTranslations).set(values as Partial<typeof socialMediaProfileTranslations.$inferInsert>).where(eq(socialMediaProfileTranslations.id, id));
      },
    });
  }
}

async function fixHomepage() {
  if (!shouldRun('homepageConfig')) return;
  log('\n=== 首页配置 homepage ===');
  const textKeys = [
    'bannerTitle', 'bannerSubtitle', 'bannerDescription',
    'solutionsTitle', 'solutionsDescription',
    'aboutTitle', 'aboutDescription',
    'stats', 'globalTitle', 'globalDescription',
    'educationTitle', 'educationDescription', 'educationItems',
    'solutionItems',
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
    await repairTranslationGroup({
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
        solutionsText: Array.isArray(row.solutionItems)
          ? (row.solutionItems as Array<Record<string, string>>).map((item) =>
            [item.title ?? '', item.description ?? '', item.badgeText ?? ''].join('|||')).join('\n')
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
        const educationSource = fields.educationText;
        if (educationSource) {
          educationSource.split(/\r?\n/).forEach((line, index) => {
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
        const solutionItems = Array.isArray(base.solutionItems)
          ? cloneJson(base.solutionItems) as Array<Record<string, string>>
          : [];
        if (fields.solutionsText) {
          fields.solutionsText.split(/\r?\n/).forEach((line, index) => {
            if (!solutionItems[index]) return;
            const [title, description, badgeText] = line.split('|||');
            Object.assign(solutionItems[index]!, {
              title: title ?? solutionItems[index]!.title,
              description: description ?? solutionItems[index]!.description,
              badgeText: badgeText ?? solutionItems[index]!.badgeText,
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
          solutionItems,
        };
      },
      insert: async (values) => {
        await db!.insert(homepageConfigTranslations).values(values as typeof homepageConfigTranslations.$inferInsert);
      },
      update: async (id, values) => {
        await db!.update(homepageConfigTranslations).set(values as Partial<typeof homepageConfigTranslations.$inferInsert>).where(eq(homepageConfigTranslations.id, id));
      },
    });
  }
}

async function repairNavColumnsArray(
  columns: Array<Record<string, unknown>>,
  scope: string,
): Promise<boolean> {
  let changed = false;

  for (let ci = 0; ci < columns.length; ci += 1) {
    const column = columns[ci]!;
    const locales = (column.locales && typeof column.locales === 'object')
      ? cloneJson(column.locales) as LocalesMap
      : {};
    const mainName = String(column.name ?? '');
    const mainLang = detectLang(mainName);
    const zh = pickLocaleCopy(locales, 'zh');
    const en = pickLocaleCopy(locales, 'en');

    const virtual: LocalesMap = { ...locales };
    if (mainLang === 'zh' && !zh.copy) virtual[CANONICAL_ZH] = { name: mainName };
    if (mainLang === 'en' && !en.copy) virtual[CANONICAL_EN] = { name: mainName };
    if (mainLang === 'zh') virtual[CANONICAL_ZH] = { name: mainName, ...(zh.copy ?? {}) };
    if (mainLang === 'en') virtual[CANONICAL_EN] = { name: mainName, ...(en.copy ?? {}) };

    const repaired = await repairLocalesMap({
      module: 'websiteConfig',
      entity: `${scope}.col:${String(column.id ?? ci)}`,
      locales: virtual,
      contentType: 'websiteNavColumn',
      fieldKeys: ['name'],
    });
    const nextZh = pickLocaleCopy(repaired.locales, 'zh');
    const nextEn = pickLocaleCopy(repaired.locales, 'en');
    if (nextZh.copy?.name) {
      column.name = String(nextZh.copy.name);
      const nextLocales: LocalesMap = {};
      for (const [code, copy] of Object.entries(repaired.locales)) {
        if (isZhLocale(code)) continue;
        nextLocales[code] = copy;
      }
      if (nextEn.copy) nextLocales[CANONICAL_EN] = nextEn.copy;
      column.locales = nextLocales;
      changed = true;
    } else if (nextEn.copy?.name) {
      column.name = String(nextEn.copy.name);
      column.locales = Object.fromEntries(
        Object.entries(repaired.locales).filter(([code]) => !isEnLocale(code)),
      );
      changed = changed || repaired.changed;
    } else if (repaired.changed) {
      column.locales = repaired.locales;
      changed = true;
    }

    const items = Array.isArray(column.items) ? column.items as Array<Record<string, unknown>> : [];
    for (let ii = 0; ii < items.length; ii += 1) {
      const item = items[ii]!;
      const itemLocales = (item.locales && typeof item.locales === 'object')
        ? cloneJson(item.locales) as LocalesMap
        : {};
      const itemName = String(item.name ?? '');
      const itemLang = detectLang(itemName);
      const itemVirtual: LocalesMap = { ...itemLocales };
      if (itemLang === 'zh') itemVirtual[CANONICAL_ZH] = { name: itemName };
      if (itemLang === 'en') itemVirtual[CANONICAL_EN] = { name: itemName };

      const itemRepaired = await repairLocalesMap({
        module: 'websiteConfig',
        entity: `${scope}.col:${String(column.id ?? ci)}.item:${String(item.id ?? ii)}`,
        locales: itemVirtual,
        contentType: 'websiteNavItem',
        fieldKeys: ['name'],
      });
      const itemZh = pickLocaleCopy(itemRepaired.locales, 'zh');
      const itemEn = pickLocaleCopy(itemRepaired.locales, 'en');
      if (itemZh.copy?.name) {
        item.name = String(itemZh.copy.name);
        const nextItemLocales: LocalesMap = {};
        for (const [code, copy] of Object.entries(itemRepaired.locales)) {
          if (isZhLocale(code)) continue;
          nextItemLocales[code] = copy;
        }
        if (itemEn.copy) nextItemLocales[CANONICAL_EN] = itemEn.copy;
        item.locales = nextItemLocales;
        changed = true;
      } else if (itemEn.copy?.name) {
        item.name = String(itemEn.copy.name);
        item.locales = Object.fromEntries(
          Object.entries(itemRepaired.locales).filter(([code]) => !isEnLocale(code)),
        );
        changed = true;
      } else if (itemRepaired.changed) {
        item.locales = itemRepaired.locales;
        changed = true;
      }
    }
  }

  return changed;
}

async function fixWebsiteNav() {
  if (!shouldRun('websiteConfig')) return;
  log('\n=== 网站配置 website nav ===');
  const configs = await db!.select().from(websiteConfigs);
  for (const config of configs) {
    const headerColumns = cloneJson(config.navColumns ?? []) as Array<Record<string, unknown>>;
    const footerColumns = cloneJson(config.footerNavColumns ?? []) as Array<Record<string, unknown>>;
    const headerChanged = await repairNavColumnsArray(headerColumns, 'header');
    const footerChanged = await repairNavColumnsArray(footerColumns, 'footer');

    if ((headerChanged || footerChanged) && !DRY_RUN) {
      await db!.update(websiteConfigs).set({
        navColumns: headerColumns as never,
        footerNavColumns: footerColumns as never,
        updatedAt: new Date(),
      }).where(eq(websiteConfigs.id, config.id));
      record({ module: 'websiteConfig', entity: config.id.slice(0, 8), action: 'updated-nav' });
    }
  }
}

async function fixProducts() {
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
    await repairTranslationGroup({
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
        const slug = String(values.slug ?? values.name ?? parent.spu)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '') || parent.spu;
        await db!.insert(productTranslations).values({
          ...(values as typeof productTranslations.$inferInsert),
          slug: `${slug}-${CANONICAL_EN}`,
          locale: CANONICAL_EN,
        });
      },
      update: async (id, values) => {
        await db!.update(productTranslations).set(values as Partial<typeof productTranslations.$inferInsert>).where(eq(productTranslations.id, id));
      },
    });
  }
}

async function fixBrandNarratives() {
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
      await repairTranslationGroup({
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
          await db!.update(brandNarrativeTranslations).set(values as Partial<typeof brandNarrativeTranslations.$inferInsert>).where(eq(brandNarrativeTranslations.id, id));
        },
      });
    }

    const content = contentByParent.get(parent.id);
    if (content?.blocks?.length) {
      const repaired = await repairBlocksTree({
        module: 'brandNarrative',
        entity: parent.slug,
        blocks: content.blocks as unknown[],
      });
      if (repaired.changed && !DRY_RUN) {
        await db!.update(brandNarrativeContents)
          .set({ blocks: repaired.blocks as never, updatedAt: new Date() })
          .where(eq(brandNarrativeContents.id, content.id));
      }
    }
  }
}

async function fixSolutions() {
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
      await repairTranslationGroup({
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
          await db!.update(solutionTranslations).set(values as Partial<typeof solutionTranslations.$inferInsert>).where(eq(solutionTranslations.id, id));
        },
      });
    }

    const content = contentByParent.get(parent.id);
    if (content?.blocks?.length) {
      const repaired = await repairBlocksTree({
        module: 'solution',
        entity: parent.slug,
        blocks: content.blocks as unknown[],
      });
      if (repaired.changed && !DRY_RUN) {
        await db!.update(solutionContents)
          .set({ blocks: repaired.blocks as never, updatedAt: new Date() })
          .where(eq(solutionContents.id, content.id));
      }
    }
  }
}

async function fixBlogs() {
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
    const label = String(pickPreferredLocaleRow(rows, 'zh')?.title
      ?? pickPreferredLocaleRow(rows, 'en')?.title
      ?? parent.id.slice(0, 8));
    await repairTranslationGroup({
      module: 'blog',
      entity: label,
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
        const slugBase = String(values.slug ?? values.title ?? 'post')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '') || `post-${parent.id.slice(0, 8)}`;
        await db!.insert(editorialContentTranslations).values({
          ...(values as typeof editorialContentTranslations.$inferInsert),
          slug: `${slugBase}-en`,
          locale: CANONICAL_EN,
        });
      },
      update: async (id, values) => {
        await db!.update(editorialContentTranslations)
          .set(values as Partial<typeof editorialContentTranslations.$inferInsert>)
          .where(eq(editorialContentTranslations.id, id));
      },
    });
  }
}

function scoreLocalesPair(locales: LocalesMap | undefined): { missingEn: boolean; zhInEn: boolean } {
  const zh = pickLocaleCopy(locales, 'zh');
  const en = pickLocaleCopy(locales, 'en');
  const zhLang = detectLang(textFromLocalesCopy(zh.copy ?? undefined));
  const enLang = detectLang(textFromLocalesCopy(en.copy ?? undefined));
  const missingEn = (zhLang === 'zh' || zhLang === 'mixed')
    && !(enLang === 'en' || enLang === 'mixed');
  return { missingEn, zhInEn: enLang === 'zh' };
}

function scoreBlocksTree(blocks: unknown[]): { missingEn: number; zhInEn: number } {
  let missingEn = 0;
  let zhInEn = 0;
  const visit = (node: Record<string, unknown> | null | undefined) => {
    if (!node || typeof node !== 'object') return;
    if (node.locales && typeof node.locales === 'object') {
      const score = scoreLocalesPair(node.locales as LocalesMap);
      if (score.missingEn) missingEn += 1;
      if (score.zhInEn) zhInEn += 1;
    }
    if (Array.isArray(node.items)) {
      for (const item of node.items) visit(item as Record<string, unknown>);
    }
  };
  for (const block of blocks) visit(block as Record<string, unknown>);
  return { missingEn, zhInEn };
}

async function verifyCoverage() {
  log('\n=== 复扫校验 ===');
  const checks: Array<{ module: string; missingEn: number; zhInEn: number }> = [];

  async function checkTable(
    module: string,
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
    let missingEn = 0;
    let zhInEn = 0;
    for (const [, group] of byParent) {
      const zh = pickPreferredLocaleRow(group as RowLike[], 'zh');
      const en = pickPreferredLocaleRow(group as RowLike[], 'en');
      const zhLang = rowLang(zh, textKeys);
      const enLang = rowLang(en, textKeys);
      if ((zhLang === 'zh' || zhLang === 'mixed') && !(enLang === 'en' || enLang === 'mixed')) {
        missingEn += 1;
      }
      if (enLang === 'zh') zhInEn += 1;
    }
    checks.push({ module, missingEn, zhInEn });
    log(`  ${module}: missingEn=${missingEn}, zhInEn=${zhInEn}`);
  }

  function pushJsonCheck(module: string, missingEn: number, zhInEn: number) {
    checks.push({ module, missingEn, zhInEn });
    log(`  ${module}: missingEn=${missingEn}, zhInEn=${zhInEn}`);
  }

  await checkTable('surgeon', await db!.select().from(surgeonTranslations), 'surgeonId', [
    'name', 'position', 'institution', 'expertise', 'experience', 'gradeTitle', 'detailDescription',
  ]);
  await checkTable('partnerCenter', await db!.select().from(partnerCenterTranslations), 'centerId', [
    'name', 'description', 'detailDescription', 'location', 'badgeText',
  ]);
  await checkTable('summit', await db!.select().from(summitTranslations), 'summitId', [
    'title', 'description', 'detailDescription', 'location',
  ]);
  await checkTable('companyProfile', await db!.select().from(companyProfileTranslations), 'profileId', [
    'companyName', 'slogan', 'positioning',
  ]);
  await checkTable('homepageConfig', await db!.select().from(homepageConfigTranslations), 'configId', [
    'bannerTitle', 'aboutTitle', 'solutionsTitle',
  ]);
  await checkTable('socialMedia', await db!.select().from(socialMediaProfileTranslations), 'profileId', [
    'featuredPosts',
  ]);
  await checkTable('brandNarrative', await db!.select().from(brandNarrativeTranslations), 'narrativeId', [
    'title', 'largeTitle', 'description',
  ]);
  await checkTable('solution', await db!.select().from(solutionTranslations), 'solutionId', [
    'title', 'largeTitle', 'description',
  ]);
  await checkTable('product', await db!.select().from(productTranslations), 'productId', [
    'name', 'shortDescription', 'description',
  ]);
  const blogs = await db!.select().from(editorialContentTranslations);
  const editorialIds = new Set(
    (await db!.select({ id: editorialContents.id }).from(editorialContents)
      .where(eq(editorialContents.contentModule, 'editorial'))).map((item) => item.id),
  );
  await checkTable(
    'blog',
    blogs.filter((row) => editorialIds.has(row.contentId)),
    'contentId',
    ['title', 'summary', 'payload'],
  );

  // JSON locales: narrative / solution blocks
  {
    let missingEn = 0;
    let zhInEn = 0;
    for (const row of await db!.select().from(brandNarrativeContents)) {
      const score = scoreBlocksTree((row.blocks ?? []) as unknown[]);
      missingEn += score.missingEn;
      zhInEn += score.zhInEn;
    }
    pushJsonCheck('brandNarrative.blocks', missingEn, zhInEn);
  }
  {
    let missingEn = 0;
    let zhInEn = 0;
    for (const row of await db!.select().from(solutionContents)) {
      const score = scoreBlocksTree((row.blocks ?? []) as unknown[]);
      missingEn += score.missingEn;
      zhInEn += score.zhInEn;
    }
    pushJsonCheck('solution.blocks', missingEn, zhInEn);
  }

  // Summit agenda locales
  {
    let missingEn = 0;
    let zhInEn = 0;
    for (const row of await db!.select().from(summits)) {
      const agenda = Array.isArray(row.agenda) ? row.agenda as Array<Record<string, unknown>> : [];
      for (const group of agenda) {
        if (group.locales && typeof group.locales === 'object') {
          const score = scoreLocalesPair(group.locales as LocalesMap);
          if (score.missingEn) missingEn += 1;
          if (score.zhInEn) zhInEn += 1;
        }
        const items = Array.isArray(group.items) ? group.items as Array<Record<string, unknown>> : [];
        for (const item of items) {
          if (item.locales && typeof item.locales === 'object') {
            const score = scoreLocalesPair(item.locales as LocalesMap);
            if (score.missingEn) missingEn += 1;
            if (score.zhInEn) zhInEn += 1;
          }
        }
      }
    }
    pushJsonCheck('summit.agenda', missingEn, zhInEn);
  }

  // Website nav: main name + locales.en (header + footer)
  {
    let missingEn = 0;
    let zhInEn = 0;
    const visitNavColumns = (columns: Array<Record<string, unknown>>) => {
      const visitNav = (name: unknown, locales: unknown) => {
        const map: LocalesMap = (locales && typeof locales === 'object')
          ? cloneJson(locales as LocalesMap)
          : {};
        const main = String(name ?? '');
        const mainLang = detectLang(main);
        if (mainLang === 'zh' && !pickLocaleCopy(map, 'zh').copy) map[CANONICAL_ZH] = { name: main };
        if (mainLang === 'en' && !pickLocaleCopy(map, 'en').copy) map[CANONICAL_EN] = { name: main };
        if (mainLang === 'zh') map[CANONICAL_ZH] = { name: main, ...(pickLocaleCopy(map, 'zh').copy ?? {}) };
        if (mainLang === 'en') map[CANONICAL_EN] = { name: main, ...(pickLocaleCopy(map, 'en').copy ?? {}) };
        const score = scoreLocalesPair(map);
        if (score.missingEn) missingEn += 1;
        if (score.zhInEn) zhInEn += 1;
      };
      for (const column of columns) {
        visitNav(column.name, column.locales);
        const items = Array.isArray(column.items) ? column.items as Array<Record<string, unknown>> : [];
        for (const item of items) visitNav(item.name, item.locales);
      }
    };
    for (const config of await db!.select().from(websiteConfigs)) {
      visitNavColumns(Array.isArray(config.navColumns) ? config.navColumns as Array<Record<string, unknown>> : []);
      visitNavColumns(Array.isArray(config.footerNavColumns) ? config.footerNavColumns as Array<Record<string, unknown>> : []);
    }
    pushJsonCheck('websiteConfig.nav', missingEn, zhInEn);
  }

  return checks;
}

async function main() {
  log(`fix-content-locales 开始 ${new Date().toISOString()} dryRun=${DRY_RUN}`);
  if (ONLY_MODULES) log(`仅模块: ${[...ONLY_MODULES].join(', ')}`);

  await fixProducts();
  await fixBrandNarratives();
  await fixSolutions();
  await fixSurgeons();
  await fixPartnerCenters();
  await fixSummits();
  await fixCompanyProfile();
  await fixSocialMedia();
  await fixHomepage();
  await fixWebsiteNav();
  await fixBlogs();

  const checks = await verifyCoverage();

  log('\n=== 摘要 ===');
  log(JSON.stringify(summary, null, 2));
  const remaining = checks.filter((item) => item.missingEn > 0 || item.zhInEn > 0);
  if (remaining.length) {
    log(`仍有问题的模块: ${remaining.map((item) => item.module).join(', ')}`);
  } else {
    log('复扫通过：未发现 zh_in_en，有中文的条目均具备有效英文。');
  }

  const cacheDir = join(process.cwd(), 'scripts', '.cache');
  mkdirSync(cacheDir, { recursive: true });
  const logPath = join(cacheDir, `fix-content-locales-${nowIso()}.log`);
  writeFileSync(logPath, logLines.join('\n'), 'utf8');
  log(`日志已写入 ${logPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
