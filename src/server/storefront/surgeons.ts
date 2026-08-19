import 'server-only';

import { asc, eq, inArray } from 'drizzle-orm';

import { resolveOssAssetUrl } from '@/lib/oss-asset-url';
import { pickTranslationForDisplay } from '@/lib/pick-translation-for-display';
import type { SurgeonGradeKey } from '@/lib/surgeon-content';
import { db } from '@/server/db';
import { surgeons, surgeonTranslations } from '@/server/db/schema';
import { getDefaultSiteLanguageCode } from '@/server/admin/site-locale';

export type StorefrontSurgeonItem = {
  slug: string;
  avatar: string;
  gradeKey: SurgeonGradeKey;
  name: string;
  position: string;
  institution: string;
  expertise: string;
  experience: string;
  gradeTitle: string;
  tags: string[];
};

export type StorefrontSurgeonsListResponse = {
  locale: string;
  items: StorefrontSurgeonItem[];
};

export async function getStorefrontSurgeonsList(input: { locale: string }): Promise<StorefrontSurgeonsListResponse> {
  const defaultLocale = await getDefaultSiteLanguageCode();
  const rows = await db.select().from(surgeons).orderBy(asc(surgeons.sortOrder), asc(surgeons.slug));

  const ids = rows.map((r) => r.id);
  const translations = ids.length
    ? await db.select().from(surgeonTranslations).where(inArray(surgeonTranslations.surgeonId, ids))
    : [];

  const byId = new Map<string, (typeof surgeonTranslations.$inferSelect)[]>();
  for (const t of translations) {
    const b = byId.get(t.surgeonId) ?? [];
    b.push(t);
    byId.set(t.surgeonId, b);
  }

  const items: StorefrontSurgeonItem[] = rows.map((row) => {
    const rowT = byId.get(row.id) ?? [];
    const localeMatch = rowT.find((t) => t.locale.toLowerCase() === input.locale.toLowerCase());
    const display = localeMatch ?? pickTranslationForDisplay(rowT, defaultLocale);
    return {
      slug: row.slug,
      avatar: resolveOssAssetUrl(row.avatar),
      gradeKey: row.gradeKey as SurgeonGradeKey,
      name: display?.name ?? row.slug,
      position: display?.position ?? '',
      institution: display?.institution ?? '',
      expertise: display?.expertise ?? '',
      experience: display?.experience ?? '',
      gradeTitle: display?.gradeTitle ?? '',
      tags: ((display?.tags ?? []) as string[]).filter(Boolean),
    };
  });

  return { locale: input.locale, items };
}
