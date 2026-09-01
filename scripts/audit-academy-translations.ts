/**
 * Audit academy CMS translation coverage (en source → zh-CN / es targets).
 *
 * Usage: pnpm exec tsx scripts/audit-academy-translations.ts
 */
import '@/lib/env';

import type { AcademyQuestionContent } from '@/lib/academy-question-content';
import { db } from '@/server/db';
import {
  academyCertificates,
  academyCertificateTranslations,
  academyCourses,
  academyCourseTranslations,
  academyLessons,
  academyLessonTranslations,
  academyQuestionBanks,
  academyQuestionBankTranslations,
  academyQuestions,
  academyQuestionTranslations,
  academyUnits,
  academyUnitTranslations,
} from '@/server/db/schema';

const TARGETS = ['zh-CN', 'es'] as const;
const SOURCE = 'en';

type LocaleRow = { locale: string; title?: string; prompt?: string };

function rowLabel(row: LocaleRow) {
  return row.title?.trim() || row.prompt?.trim() || '';
}

function hasLocale(rows: LocaleRow[], locale: string) {
  return rows.some((row) => row.locale.toLowerCase() === locale.toLowerCase() && rowLabel(row));
}

function pickLabel(rows: LocaleRow[], locale: string) {
  const row = rows.find((item) => item.locale.toLowerCase() === locale.toLowerCase());
  return row ? rowLabel(row) : '';
}

type AuditResult = {
  module: string;
  total: number;
  withEn: number;
  missingEn: string[];
  missingByLocale: Record<string, string[]>;
};

function audit(
  module: string,
  items: Array<{ id: string; label: string; translations: LocaleRow[] }>,
): AuditResult {
  const withEn = items.filter((item) => hasLocale(item.translations, SOURCE));
  const missingEn = items
    .filter((item) => !hasLocale(item.translations, SOURCE))
    .map((item) => item.label);

  const missingByLocale: Record<string, string[]> = {};
  for (const target of TARGETS) {
    missingByLocale[target] = withEn
      .filter((item) => !hasLocale(item.translations, target))
      .map((item) => {
        const enLabel = pickLabel(item.translations, SOURCE);
        return enLabel ? `${item.label} — ${enLabel.slice(0, 60)}` : item.label;
      });
  }

  return {
    module,
    total: items.length,
    withEn: withEn.length,
    missingEn,
    missingByLocale,
  };
}

function printResult(result: AuditResult) {
  console.log(`\n## ${result.module}`);
  console.log(`总数: ${result.total} | 有英文源: ${result.withEn}`);
  if (result.missingEn.length) {
    console.log(`缺少英文源 (${result.missingEn.length}):`);
    for (const label of result.missingEn.slice(0, 20)) console.log(`  - ${label}`);
    if (result.missingEn.length > 20) console.log(`  ... 另有 ${result.missingEn.length - 20} 条`);
  }
  for (const target of TARGETS) {
    const missing = result.missingByLocale[target] ?? [];
    console.log(`缺少 ${target} (${missing.length}):`);
    if (!missing.length) {
      console.log('  (无)');
      continue;
    }
    for (const label of missing.slice(0, 20)) console.log(`  - ${label}`);
    if (missing.length > 20) console.log(`  ... 另有 ${missing.length - 20} 条`);
  }
}

async function main() {
  const [
    certificates,
    courses,
    units,
    lessons,
    questionBanks,
    questions,
    certTranslations,
    courseTranslations,
    unitTranslations,
    lessonTranslations,
    bankTranslations,
    questionTranslations,
  ] = await Promise.all([
    db.select({ id: academyCertificates.id, slug: academyCertificates.slug }).from(academyCertificates),
    db.select({ id: academyCourses.id, slug: academyCourses.slug }).from(academyCourses),
    db.select({ id: academyUnits.id, courseId: academyUnits.courseId }).from(academyUnits),
    db.select({ id: academyLessons.id, unitId: academyLessons.unitId }).from(academyLessons),
    db.select({ id: academyQuestionBanks.id }).from(academyQuestionBanks),
    db.select({ id: academyQuestions.id, questionBankId: academyQuestions.questionBankId }).from(academyQuestions),
    db.select({
      certificateId: academyCertificateTranslations.certificateId,
      locale: academyCertificateTranslations.locale,
      title: academyCertificateTranslations.title,
    }).from(academyCertificateTranslations),
    db.select({
      courseId: academyCourseTranslations.courseId,
      locale: academyCourseTranslations.locale,
      title: academyCourseTranslations.title,
    }).from(academyCourseTranslations),
    db.select({
      unitId: academyUnitTranslations.unitId,
      locale: academyUnitTranslations.locale,
      title: academyUnitTranslations.title,
    }).from(academyUnitTranslations),
    db.select({
      lessonId: academyLessonTranslations.lessonId,
      locale: academyLessonTranslations.locale,
      title: academyLessonTranslations.title,
    }).from(academyLessonTranslations),
    db.select({
      questionBankId: academyQuestionBankTranslations.questionBankId,
      locale: academyQuestionBankTranslations.locale,
      title: academyQuestionBankTranslations.title,
    }).from(academyQuestionBankTranslations),
    db.select({
      questionId: academyQuestionTranslations.questionId,
      locale: academyQuestionTranslations.locale,
      content: academyQuestionTranslations.content,
    }).from(academyQuestionTranslations),
  ]);

  const courseSlugById = new Map(courses.map((row) => [row.id, row.slug]));

  function groupByParent<T extends { locale: string; title?: string; content?: AcademyQuestionContent }>(
    rows: T[],
    key: keyof T,
  ) {
    const map = new Map<string, LocaleRow[]>();
    for (const row of rows) {
      const parentId = String(row[key]);
      const bucket = map.get(parentId) ?? [];
      bucket.push({
        locale: row.locale,
        title: row.title,
        prompt: row.content?.prompt,
      });
      map.set(parentId, bucket);
    }
    return map;
  }

  const certT = groupByParent(certTranslations, 'certificateId');
  const courseT = groupByParent(courseTranslations, 'courseId');
  const unitT = groupByParent(unitTranslations, 'unitId');
  const lessonT = groupByParent(lessonTranslations, 'lessonId');
  const bankT = groupByParent(bankTranslations, 'questionBankId');
  const questionT = groupByParent(questionTranslations, 'questionId');

  const results = [
    audit('证书 (certificate)', certificates.map((row) => ({
      id: row.id,
      label: row.slug,
      translations: certT.get(row.id) ?? [],
    }))),
    audit('课程 (course)', courses.map((row) => ({
      id: row.id,
      label: row.slug,
      translations: courseT.get(row.id) ?? [],
    }))),
    audit('单元 (unit)', units.map((row) => {
      const enTitle = pickLabel(unitT.get(row.id) ?? [], SOURCE);
      return {
        id: row.id,
        label: `${courseSlugById.get(row.courseId) ?? '?'}${enTitle ? ` / ${enTitle}` : ''}`,
        translations: unitT.get(row.id) ?? [],
      };
    })),
    audit('课时 (lesson)', lessons.map((row) => {
      const enTitle = pickLabel(lessonT.get(row.id) ?? [], SOURCE);
      return {
        id: row.id,
        label: `${enTitle || `lesson:${row.id.slice(0, 8)}`}`,
        translations: lessonT.get(row.id) ?? [],
      };
    })),
    audit('题库 (questionBank)', questionBanks.map((row, index) => {
      const enTitle = pickLabel(bankT.get(row.id) ?? [], SOURCE);
      return {
        id: row.id,
        label: enTitle || `bank:${row.id.slice(0, 8)} (#${index + 1})`,
        translations: bankT.get(row.id) ?? [],
      };
    })),
    audit('题目 (question)', questions.map((row, index) => {
      const enPrompt = pickLabel(questionT.get(row.id) ?? [], SOURCE);
      return {
        id: row.id,
        label: enPrompt
          ? `${enPrompt.slice(0, 80)}${enPrompt.length > 80 ? '…' : ''}`
          : `bank:${row.questionBankId.slice(0, 8)} / q:${row.id.slice(0, 8)} (#${index + 1})`,
        translations: questionT.get(row.id) ?? [],
      };
    })),
  ];

  console.log('Academy 翻译覆盖率审计');
  console.log(`源语言: ${SOURCE} → 目标: ${TARGETS.join(', ')}`);

  let totalMissingZh = 0;
  let totalMissingEs = 0;
  for (const result of results) {
    printResult(result);
    totalMissingZh += result.missingByLocale['zh-CN']?.length ?? 0;
    totalMissingEs += result.missingByLocale['es']?.length ?? 0;
  }

  console.log('\n## 汇总');
  console.log(`待补 zh-CN: ${totalMissingZh} 条`);
  console.log(`待补 es: ${totalMissingEs} 条`);

  const modulesNeedingWork = results
    .filter((result) =>
      result.missingEn.length > 0
      || (result.missingByLocale['zh-CN']?.length ?? 0) > 0
      || (result.missingByLocale['es']?.length ?? 0) > 0,
    )
    .map((result) => result.module);

  if (!modulesNeedingWork.length) {
    console.log('全部已覆盖 ✓');
  } else {
    console.log(`需处理模块: ${modulesNeedingWork.join(', ')}`);
    console.log('\n建议执行:');
    console.log('  pnpm exec tsx scripts/translate-academy-from-en.ts');
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
