/**
 * Translate academy CMS content from English → zh-CN + es (always overwrite targets).
 *
 * Usage:
 *   pnpm exec tsx scripts/translate-academy-from-en.ts
 *   pnpm exec tsx scripts/translate-academy-from-en.ts --dry-run
 *   pnpm exec tsx scripts/translate-academy-from-en.ts --modules=certificate,course --delay-ms=400
 */
import '@/lib/env';

import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

import { and, eq } from 'drizzle-orm';

import type { AcademyStat } from '@/lib/academy-content-shared';
import type { AcademyQuestionContent, AcademyQuestionType } from '@/lib/academy-question-content';
import { translateText } from '@/server/ai/translate';
import { db } from '@/server/db';
import {
  academyCertificates,
  academyCertificateTranslations,
  academyCourseTranslations,
  academyCourses,
  academyLessonTranslations,
  academyLessons,
  academyQuestionBankTranslations,
  academyQuestionBanks,
  academyQuestions,
  academyQuestionTranslations,
  academyUnitTranslations,
  academyUnits,
} from '@/server/db/schema';

import { translateAcademyQuestionContent } from './lib/translate-academy-question-content';
import { CANONICAL_EN, CANONICAL_ZH, pickPreferredLocaleRow, sleep } from './lib/locale-detect';

if (!db) {
  throw new Error('DATABASE_URL is required');
}

const CANONICAL_ES = 'es';
const TARGETS = [CANONICAL_ZH, CANONICAL_ES] as const;

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

type LogAction = { module: string; entity: string; action: string; detail?: string };

const logLines: string[] = [];
const summary = {
  missing_en: 0,
  translate_zh: 0,
  translate_es: 0,
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

async function tr(text: string, targetLocale: string, context: string) {
  const trimmed = text.trim();
  if (!trimmed) return '';
  return translateText({
    text: trimmed,
    sourceLocale: CANONICAL_EN,
    targetLocale,
    context,
  });
}

async function trArray(items: string[], targetLocale: string, context: string) {
  const out: string[] = [];
  for (const item of items) {
    if (!item.trim()) continue;
    out.push(await tr(item, targetLocale, context));
    await sleep(50);
  }
  return out;
}

async function trStats(stats: AcademyStat[], targetLocale: string) {
  const out: AcademyStat[] = [];
  for (const item of stats) {
    const label = item.label?.trim() ?? '';
    const value = item.value?.trim() ?? '';
    if (!label && !value) continue;
    out.push({
      label: label ? await tr(label, targetLocale, 'certificate statistic label') : '',
      value,
    });
    await sleep(50);
  }
  return out;
}

type RichTranslationRow = {
  id: string;
  locale: string;
  title: string;
  subtitle?: string;
  badgeLabel?: string;
  summary?: string;
  description?: string;
  seoTitle?: string;
  seoDescription?: string;
  stats?: AcademyStat[];
  learnings?: string[];
  skills?: string[];
  tools?: string[];
};

async function translateRichFields(en: RichTranslationRow, targetLocale: string) {
  return {
    title: await tr(en.title, targetLocale, 'academy title'),
    subtitle: en.subtitle?.trim() ? await tr(en.subtitle, targetLocale, 'academy subtitle') : '',
    badgeLabel: en.badgeLabel?.trim() ? await tr(en.badgeLabel, targetLocale, 'academy badge label') : '',
    summary: en.summary?.trim() ? await tr(en.summary, targetLocale, 'academy summary') : '',
    description: en.description?.trim() ? await tr(en.description, targetLocale, 'academy description') : '',
    seoTitle: en.seoTitle?.trim() ? await tr(en.seoTitle, targetLocale, 'SEO title') : '',
    seoDescription: en.seoDescription?.trim() ? await tr(en.seoDescription, targetLocale, 'SEO description') : '',
    stats: await trStats(en.stats ?? [], targetLocale),
    learnings: await trArray(en.learnings ?? [], targetLocale, 'learning outcome'),
    skills: await trArray(en.skills ?? [], targetLocale, 'skill tag'),
    tools: await trArray(en.tools ?? [], targetLocale, 'tool tag'),
  };
}

async function upsertTranslation<T extends { id: string; locale: string }>(options: {
  table: typeof academyCertificateTranslations;
  parentKey: 'certificateId' | 'courseId' | 'unitId' | 'lessonId' | 'questionBankId' | 'questionId';
  parentId: string;
  locale: string;
  values: Record<string, unknown>;
  existing: T | null;
}) {
  if (DRY_RUN) return;
  const timestamp = new Date();
  if (options.existing) {
    await db
      .update(options.table)
      .set({ ...options.values, locale: options.locale, updatedAt: timestamp })
      .where(eq(options.table.id, options.existing.id));
    return;
  }
  await db.insert(options.table).values({
    [options.parentKey]: options.parentId,
    locale: options.locale,
    ...options.values,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}

async function processRichEntity(options: {
  module: string;
  parentKey: 'certificateId' | 'courseId';
  parentId: string;
  entityLabel: string;
  rows: RichTranslationRow[];
  table: typeof academyCertificateTranslations | typeof academyCourseTranslations;
}) {
  const en = pickPreferredLocaleRow(options.rows, 'en');
  if (!en?.title?.trim()) {
    summary.missing_en += 1;
    record({ module: options.module, entity: options.entityLabel, action: 'missing_en' });
    return;
  }

  for (const targetLocale of TARGETS) {
    try {
      if (DRY_RUN) {
        if (targetLocale === CANONICAL_ZH) summary.translate_zh += 1;
        else summary.translate_es += 1;
        record({ module: options.module, entity: options.entityLabel, action: `dry-translate_${targetLocale}` });
        continue;
      }

      const translated = await translateRichFields(en, targetLocale);
      const existing = options.rows.find((row) => row.locale.toLowerCase() === targetLocale.toLowerCase()) ?? null;
      await upsertTranslation({
        table: options.table as typeof academyCertificateTranslations,
        parentKey: options.parentKey,
        parentId: options.parentId,
        locale: targetLocale,
        values: translated,
        existing,
      });

      if (targetLocale === CANONICAL_ZH) summary.translate_zh += 1;
      else summary.translate_es += 1;
      record({ module: options.module, entity: options.entityLabel, action: `translate_${targetLocale}` });
      summary.ok += 1;
      await sleep(delayMs);
    } catch (error) {
      summary.failed += 1;
      record({
        module: options.module,
        entity: options.entityLabel,
        action: 'failed',
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

async function translateCertificates() {
  if (!shouldRun('certificate')) return;
  const certs = await db.select({ id: academyCertificates.id, slug: academyCertificates.slug }).from(academyCertificates);
  for (const cert of certs) {
    const rows = await db
      .select()
      .from(academyCertificateTranslations)
      .where(eq(academyCertificateTranslations.certificateId, cert.id));
    await processRichEntity({
      module: 'certificate',
      parentKey: 'certificateId',
      parentId: cert.id,
      entityLabel: cert.slug,
      rows: rows as RichTranslationRow[],
      table: academyCertificateTranslations,
    });
  }
}

async function translateCourses() {
  if (!shouldRun('course')) return;
  const courses = await db.select({ id: academyCourses.id, slug: academyCourses.slug }).from(academyCourses);
  for (const course of courses) {
    const rows = await db
      .select()
      .from(academyCourseTranslations)
      .where(eq(academyCourseTranslations.courseId, course.id));
    await processRichEntity({
      module: 'course',
      parentKey: 'courseId',
      parentId: course.id,
      entityLabel: course.slug,
      rows: rows as RichTranslationRow[],
      table: academyCourseTranslations,
    });
  }
}

async function translateUnits() {
  if (!shouldRun('unit')) return;
  const units = await db.select({ id: academyUnits.id, courseId: academyUnits.courseId }).from(academyUnits);
  for (const unit of units) {
    const rows = await db.select().from(academyUnitTranslations).where(eq(academyUnitTranslations.unitId, unit.id));
    const en = pickPreferredLocaleRow(rows, 'en');
    if (!en?.title?.trim()) {
      summary.missing_en += 1;
      record({ module: 'unit', entity: unit.id.slice(0, 8), action: 'missing_en' });
      continue;
    }
    for (const targetLocale of TARGETS) {
      try {
        if (DRY_RUN) {
          if (targetLocale === CANONICAL_ZH) summary.translate_zh += 1;
          else summary.translate_es += 1;
          record({ module: 'unit', entity: unit.id.slice(0, 8), action: `dry-translate_${targetLocale}` });
          continue;
        }
        const title = await tr(en.title, targetLocale, 'course unit title');
        const existing = rows.find((row) => row.locale.toLowerCase() === targetLocale.toLowerCase()) ?? null;
        await upsertTranslation({
          table: academyUnitTranslations as unknown as typeof academyCertificateTranslations,
          parentKey: 'unitId',
          parentId: unit.id,
          locale: targetLocale,
          values: { title },
          existing,
        });
        if (targetLocale === CANONICAL_ZH) summary.translate_zh += 1;
        else summary.translate_es += 1;
        summary.ok += 1;
        record({ module: 'unit', entity: unit.id.slice(0, 8), action: `translate_${targetLocale}` });
        await sleep(delayMs);
      } catch (error) {
        summary.failed += 1;
        record({ module: 'unit', entity: unit.id.slice(0, 8), action: 'failed', detail: String(error) });
      }
    }
  }
}

async function translateLessons() {
  if (!shouldRun('lesson')) return;
  const lessons = await db.select({ id: academyLessons.id }).from(academyLessons);
  for (const lesson of lessons) {
    const rows = await db.select().from(academyLessonTranslations).where(eq(academyLessonTranslations.lessonId, lesson.id));
    const en = pickPreferredLocaleRow(rows, 'en');
    if (!en?.title?.trim()) {
      summary.missing_en += 1;
      record({ module: 'lesson', entity: lesson.id.slice(0, 8), action: 'missing_en' });
      continue;
    }
    for (const targetLocale of TARGETS) {
      try {
        if (DRY_RUN) {
          if (targetLocale === CANONICAL_ZH) summary.translate_zh += 1;
          else summary.translate_es += 1;
          record({ module: 'lesson', entity: lesson.id.slice(0, 8), action: `dry-translate_${targetLocale}` });
          continue;
        }
        const title = await tr(en.title, targetLocale, 'lesson title');
        const description = en.description?.trim()
          ? await tr(en.description, targetLocale, 'lesson description')
          : '';
        const existing = rows.find((row) => row.locale.toLowerCase() === targetLocale.toLowerCase()) ?? null;
        await upsertTranslation({
          table: academyLessonTranslations as unknown as typeof academyCertificateTranslations,
          parentKey: 'lessonId',
          parentId: lesson.id,
          locale: targetLocale,
          values: { title, description },
          existing,
        });
        if (targetLocale === CANONICAL_ZH) summary.translate_zh += 1;
        else summary.translate_es += 1;
        summary.ok += 1;
        record({ module: 'lesson', entity: lesson.id.slice(0, 8), action: `translate_${targetLocale}` });
        await sleep(delayMs);
      } catch (error) {
        summary.failed += 1;
        record({ module: 'lesson', entity: lesson.id.slice(0, 8), action: 'failed', detail: String(error) });
      }
    }
  }
}

async function translateQuestionBanks() {
  if (!shouldRun('questionBank')) return;
  const banks = await db.select({ id: academyQuestionBanks.id }).from(academyQuestionBanks);
  for (const bank of banks) {
    const rows = await db
      .select()
      .from(academyQuestionBankTranslations)
      .where(eq(academyQuestionBankTranslations.questionBankId, bank.id));
    const en = pickPreferredLocaleRow(rows, 'en');
    if (!en?.title?.trim()) {
      summary.missing_en += 1;
      record({ module: 'questionBank', entity: bank.id.slice(0, 8), action: 'missing_en' });
      continue;
    }
    for (const targetLocale of TARGETS) {
      try {
        if (DRY_RUN) {
          if (targetLocale === CANONICAL_ZH) summary.translate_zh += 1;
          else summary.translate_es += 1;
          record({ module: 'questionBank', entity: bank.id.slice(0, 8), action: `dry-translate_${targetLocale}` });
          continue;
        }
        const title = await tr(en.title, targetLocale, 'question bank title');
        const existing = rows.find((row) => row.locale.toLowerCase() === targetLocale.toLowerCase()) ?? null;
        await upsertTranslation({
          table: academyQuestionBankTranslations as unknown as typeof academyCertificateTranslations,
          parentKey: 'questionBankId',
          parentId: bank.id,
          locale: targetLocale,
          values: { title },
          existing,
        });
        if (targetLocale === CANONICAL_ZH) summary.translate_zh += 1;
        else summary.translate_es += 1;
        summary.ok += 1;
        record({ module: 'questionBank', entity: bank.id.slice(0, 8), action: `translate_${targetLocale}` });
        await sleep(delayMs);
      } catch (error) {
        summary.failed += 1;
        record({ module: 'questionBank', entity: bank.id.slice(0, 8), action: 'failed', detail: String(error) });
      }
    }
  }
}

async function translateQuestions() {
  if (!shouldRun('question')) return;
  const questions = await db
    .select({ id: academyQuestions.id, questionType: academyQuestions.questionType })
    .from(academyQuestions);
  for (const question of questions) {
    const rows = await db
      .select()
      .from(academyQuestionTranslations)
      .where(eq(academyQuestionTranslations.questionId, question.id));
    const en = pickPreferredLocaleRow(rows, 'en');
    if (!en?.content || typeof en.content !== 'object') {
      summary.missing_en += 1;
      record({ module: 'question', entity: question.id.slice(0, 8), action: 'missing_en' });
      continue;
    }
    for (const targetLocale of TARGETS) {
      try {
        if (DRY_RUN) {
          if (targetLocale === CANONICAL_ZH) summary.translate_zh += 1;
          else summary.translate_es += 1;
          record({ module: 'question', entity: question.id.slice(0, 8), action: `dry-translate_${targetLocale}` });
          continue;
        }
        const content = await translateAcademyQuestionContent(
          question.questionType as AcademyQuestionType,
          en.content as AcademyQuestionContent,
          CANONICAL_EN,
          targetLocale,
        );
        const existing = rows.find((row) => row.locale.toLowerCase() === targetLocale.toLowerCase()) ?? null;
        await upsertTranslation({
          table: academyQuestionTranslations as unknown as typeof academyCertificateTranslations,
          parentKey: 'questionId',
          parentId: question.id,
          locale: targetLocale,
          values: { content },
          existing,
        });
        if (targetLocale === CANONICAL_ZH) summary.translate_zh += 1;
        else summary.translate_es += 1;
        summary.ok += 1;
        record({ module: 'question', entity: question.id.slice(0, 8), action: `translate_${targetLocale}` });
        await sleep(delayMs);
      } catch (error) {
        summary.failed += 1;
        record({ module: 'question', entity: question.id.slice(0, 8), action: 'failed', detail: String(error) });
      }
    }
  }
}

async function main() {
  log(`translate-academy-from-en ${DRY_RUN ? '(dry-run)' : ''}`);
  log(`targets: ${TARGETS.join(', ')} delayMs=${delayMs}`);

  await translateCertificates();
  await translateCourses();
  await translateUnits();
  await translateLessons();
  await translateQuestionBanks();
  await translateQuestions();

  log('');
  log(`summary: ok=${summary.ok} zh=${summary.translate_zh} es=${summary.translate_es} missing_en=${summary.missing_en} failed=${summary.failed}`);

  const logDir = join(process.cwd(), 'scripts', 'logs');
  mkdirSync(logDir, { recursive: true });
  const logPath = join(logDir, `translate-academy-from-en-${nowIso()}.log`);
  writeFileSync(logPath, `${logLines.join('\n')}\n`, 'utf8');
  log(`log written: ${logPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
