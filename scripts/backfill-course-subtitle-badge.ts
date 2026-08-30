/**
 * Backfill short title-like subtitles (and badges if empty) for course translations.
 * Subtitles are intentionally different from summary.
 * Run: pnpm exec tsx scripts/backfill-course-subtitle-badge.ts
 */
import 'dotenv/config';

import { eq } from 'drizzle-orm';

import { db } from '../src/server/db';
import { academyCourseTranslations, academyCourses } from '../src/server/db/schema';

const SUBTITLE_BY_SLUG: Record<string, { en: string; zh: string }> = {
  'small-animal-internal-medicine': {
    en: 'Core internal medicine cases',
    zh: '小动物内科核心病例',
  },
  'canine-feline-imaging': {
    en: 'Radiograph and ultrasound skills',
    zh: '影像判读与超声基础',
  },
  'clinical-nutrition-basics': {
    en: 'Wellness feeding fundamentals',
    zh: '健康营养喂养基础',
  },
  'veterinary-anesthesia': {
    en: 'Safe anesthesia and analgesia',
    zh: '麻醉与镇痛安全实践',
  },
  'soft-tissue-surgery': {
    en: 'Everyday soft tissue procedures',
    zh: '软组织手术日常技能',
  },
  'emergency-critical-care': {
    en: 'Triage to critical stabilization',
    zh: '分诊到危重稳定',
  },
  'advanced-diagnostic-imaging': {
    en: 'Complex multimodal imaging cases',
    zh: '复杂多模态影像病例',
  },
  'therapeutic-nutrition': {
    en: 'Disease-specific diet therapy',
    zh: '疾病专项饮食疗法',
  },
  'minimally-invasive-surgery': {
    en: 'Laparoscopy starter pathway',
    zh: '微创腹腔镜入门',
  },
};

function pickBadge(title: string, skills: string[] | null | undefined) {
  const firstSkill = (skills ?? []).map((item) => item.trim()).find(Boolean);
  if (firstSkill) return firstSkill.slice(0, 40);

  const cleaned = title
    .replace(/\b(fundamentals|introduction|essentials|basics|course|课程|基础|入门)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const words = cleaned.split(' ').filter(Boolean);
  if (words.length >= 2) return words.slice(0, 2).join(' ').slice(0, 40);
  return (words[0] || 'Course').slice(0, 40);
}

function pickSubtitle(slug: string, title: string, locale: string) {
  const preset = SUBTITLE_BY_SLUG[slug];
  if (preset) {
    return /^zh/i.test(locale) ? preset.zh : preset.en;
  }

  const cleaned = title
    .replace(/\b(fundamentals|introduction|essentials|basics|course|课程|基础|入门)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (/^zh/i.test(locale)) {
    return cleaned ? `${cleaned}实践要点` : '课程实践要点';
  }
  return cleaned ? `${cleaned} in practice` : 'Course practice focus';
}

async function main() {
  const rows = await db
    .select({
      id: academyCourseTranslations.id,
      locale: academyCourseTranslations.locale,
      title: academyCourseTranslations.title,
      skills: academyCourseTranslations.skills,
      subtitle: academyCourseTranslations.subtitle,
      badgeLabel: academyCourseTranslations.badgeLabel,
      slug: academyCourses.slug,
    })
    .from(academyCourseTranslations)
    .innerJoin(academyCourses, eq(academyCourses.id, academyCourseTranslations.courseId));

  let updated = 0;
  for (const row of rows) {
    const badgeLabel = row.badgeLabel?.trim()
      || pickBadge(row.title || row.slug, row.skills as string[] | null);
    const subtitle = pickSubtitle(row.slug, row.title || row.slug, row.locale);
    await db
      .update(academyCourseTranslations)
      .set({ badgeLabel, subtitle, updatedAt: new Date() })
      .where(eq(academyCourseTranslations.id, row.id));
    updated += 1;
    console.log(`[backfill] ${row.slug} (${row.locale}): badge="${badgeLabel}" subtitle="${subtitle}"`);
  }
  console.log(`[backfill] Done. Updated ${updated}/${rows.length} translation(s).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
