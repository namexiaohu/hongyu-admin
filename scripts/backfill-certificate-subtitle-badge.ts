/**
 * Backfill short title-like subtitles (and badges if empty) for certificate translations.
 * Run: pnpm exec tsx scripts/backfill-certificate-subtitle-badge.ts
 */
import 'dotenv/config';

import { eq } from 'drizzle-orm';

import { db } from '../src/server/db';
import { academyCertificateTranslations, academyCertificates } from '../src/server/db/schema';

const SUBTITLE_BY_SLUG: Record<string, { en: string; zh: string }> = {
  'small-animal-clinical': {
    en: 'Clinic-ready companion animal care',
    zh: '小动物临床诊疗核心能力',
  },
  'veterinary-imaging': {
    en: 'Imaging from capture to diagnosis',
    zh: '影像采集到诊断判读',
  },
  'pet-nutrition-health': {
    en: 'Nutrition for wellness and disease',
    zh: '健康与疾病营养管理',
  },
  'veterinary-surgery': {
    en: 'Soft tissue to advanced surgery',
    zh: '软组织到进阶手术技能',
  },
};

function pickBadge(title: string, skills: string[] | null | undefined) {
  const firstSkill = (skills ?? []).map((item) => item.trim()).find(Boolean);
  if (firstSkill) return firstSkill.slice(0, 40);

  const cleaned = title
    .replace(/\b(professional|certificate|certification|program|programme|专项|专业|证书)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const words = cleaned.split(' ').filter(Boolean);
  if (words.length >= 2) return words.slice(0, 2).join(' ').slice(0, 40);
  return (words[0] || 'Certificate').slice(0, 40);
}

function pickSubtitle(slug: string, title: string, locale: string) {
  const preset = SUBTITLE_BY_SLUG[slug];
  if (preset) {
    return /^zh/i.test(locale) ? preset.zh : preset.en;
  }

  const cleaned = title
    .replace(/\b(professional|certificate|certification|program|programme|专项|专业|证书)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (/^zh/i.test(locale)) {
    return cleaned ? `${cleaned}进阶路径` : '专业进阶学习路径';
  }
  return cleaned ? `${cleaned} pathway` : 'Professional learning pathway';
}

async function main() {
  const rows = await db
    .select({
      id: academyCertificateTranslations.id,
      locale: academyCertificateTranslations.locale,
      title: academyCertificateTranslations.title,
      skills: academyCertificateTranslations.skills,
      subtitle: academyCertificateTranslations.subtitle,
      badgeLabel: academyCertificateTranslations.badgeLabel,
      slug: academyCertificates.slug,
    })
    .from(academyCertificateTranslations)
    .innerJoin(academyCertificates, eq(academyCertificates.id, academyCertificateTranslations.certificateId));

  let updated = 0;
  for (const row of rows) {
    const badgeLabel = row.badgeLabel?.trim()
      || pickBadge(row.title || row.slug, row.skills as string[] | null);
    const subtitle = pickSubtitle(row.slug, row.title || row.slug, row.locale);
    await db
      .update(academyCertificateTranslations)
      .set({ badgeLabel, subtitle, updatedAt: new Date() })
      .where(eq(academyCertificateTranslations.id, row.id));
    updated += 1;
    console.log(`[backfill] ${row.slug} (${row.locale}): badge="${badgeLabel}" subtitle="${subtitle}"`);
  }
  console.log(`[backfill] Done. Updated ${updated}/${rows.length} translation(s).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
