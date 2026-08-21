import 'server-only';

import { and, asc, count, eq, ilike, inArray, or } from 'drizzle-orm';

import { normalizePageSize } from '@/lib/admin-list-query';
import { pickTranslationForDisplay } from '@/lib/pick-translation-for-display';
import type { SurgeonGradeKey } from '@/lib/surgeon-content';
import { resolveSurgeonDisplayName, surgeonGradeKeys } from '@/lib/surgeon-content';
import type {
  SurgeonPickerItem,
  SurgeonPickerListQuery,
  SurgeonPickerListResult,
} from '@/lib/surgeon-picker';
import { getDefaultSiteLanguageCode } from '@/server/admin/site-locale';
import { db } from '@/server/db';
import { surgeons, surgeonTranslations } from '@/server/db/schema';

function toPickerItem(
  row: typeof surgeons.$inferSelect,
  translations: Array<typeof surgeonTranslations.$inferSelect>,
  defaultLocale: string,
): SurgeonPickerItem {
  const display = pickTranslationForDisplay(translations, defaultLocale);
  return {
    id: row.id,
    name: resolveSurgeonDisplayName(display, row.slug),
    slug: row.slug,
    avatar: row.avatar,
    gradeKey: row.gradeKey as SurgeonGradeKey,
    position: display?.position ?? '',
    institution: display?.institution ?? '',
  };
}

export async function listAdminSurgeonsForPicker(
  query: SurgeonPickerListQuery = {},
): Promise<SurgeonPickerListResult> {
  const page = Math.max(1, Math.floor(query.page ?? 1));
  const pageSize = normalizePageSize(query.pageSize ?? 50);
  const keyword = query.keyword?.trim() ?? '';
  const gradeKey = query.gradeKey && surgeonGradeKeys.includes(query.gradeKey)
    ? query.gradeKey
    : undefined;

  const conditions = [];
  if (gradeKey) {
    conditions.push(eq(surgeons.gradeKey, gradeKey));
  }

  let matchingIds: string[] | undefined;
  if (keyword) {
    const pattern = `%${keyword}%`;
    const rows = await db
      .selectDistinct({ surgeonId: surgeonTranslations.surgeonId })
      .from(surgeonTranslations)
      .innerJoin(surgeons, eq(surgeons.id, surgeonTranslations.surgeonId))
      .where(and(
        ...(gradeKey ? [eq(surgeons.gradeKey, gradeKey)] : []),
        or(
          ilike(surgeons.slug, pattern),
          ilike(surgeonTranslations.name, pattern),
          ilike(surgeonTranslations.position, pattern),
          ilike(surgeonTranslations.institution, pattern),
          ilike(surgeonTranslations.expertise, pattern),
        ),
      ));
    matchingIds = rows.map((row) => row.surgeonId);
    if (!matchingIds.length) {
      return { items: [], total: 0, page, pageSize };
    }
    conditions.push(inArray(surgeons.id, matchingIds));
  }

  const whereClause = conditions.length ? and(...conditions) : undefined;

  const [totalRow] = await db
    .select({ value: count() })
    .from(surgeons)
    .where(whereClause);

  const total = Number(totalRow?.value ?? 0);
  const rows = await db
    .select()
    .from(surgeons)
    .where(whereClause)
    .orderBy(asc(surgeons.sortOrder), asc(surgeons.slug))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const ids = rows.map((row) => row.id);
  const translations = ids.length
    ? await db.select().from(surgeonTranslations).where(inArray(surgeonTranslations.surgeonId, ids))
    : [];
  const byId = new Map<string, (typeof surgeonTranslations.$inferSelect)[]>();
  for (const row of translations) {
    const bucket = byId.get(row.surgeonId) ?? [];
    bucket.push(row);
    byId.set(row.surgeonId, bucket);
  }

  const defaultLocale = await getDefaultSiteLanguageCode();
  return {
    items: rows.map((row) => toPickerItem(row, byId.get(row.id) ?? [], defaultLocale)),
    total,
    page,
    pageSize,
  };
}

export async function lookupAdminSurgeonsForPicker(ids: string[]): Promise<SurgeonPickerItem[]> {
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  if (!uniqueIds.length) return [];

  const rows = await db.select().from(surgeons).where(inArray(surgeons.id, uniqueIds));
  if (!rows.length) return [];

  const translations = await db
    .select()
    .from(surgeonTranslations)
    .where(inArray(surgeonTranslations.surgeonId, rows.map((row) => row.id)));
  const byId = new Map<string, (typeof surgeonTranslations.$inferSelect)[]>();
  for (const row of translations) {
    const bucket = byId.get(row.surgeonId) ?? [];
    bucket.push(row);
    byId.set(row.surgeonId, bucket);
  }

  const defaultLocale = await getDefaultSiteLanguageCode();
  const map = new Map(
    rows.map((row) => [row.id, toPickerItem(row, byId.get(row.id) ?? [], defaultLocale)]),
  );
  return uniqueIds.map((id) => map.get(id)).filter((item): item is SurgeonPickerItem => Boolean(item));
}
