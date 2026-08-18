import { asc, desc, eq } from 'drizzle-orm';

import { db } from '@/server/db';
import { siteLanguages } from '@/server/db/schema';

export type StorefrontLanguage = {
  code: string;
  name: string;
  nativeName: string;
  region: string;
  direction: 'ltr' | 'rtl';
  countryCodes: string[];
  currencyCode: string;
  isDefault: boolean;
  sortOrder: number;
};

export async function getStorefrontLanguages(): Promise<StorefrontLanguage[]> {
  const rows = await db
    .select({
      code: siteLanguages.code,
      name: siteLanguages.name,
      nativeName: siteLanguages.nativeName,
      region: siteLanguages.region,
      direction: siteLanguages.direction,
      countryCodes: siteLanguages.countryCodes,
      currencyCode: siteLanguages.currencyCode,
      isDefault: siteLanguages.isDefault,
      sortOrder: siteLanguages.sortOrder,
    })
    .from(siteLanguages)
    .where(eq(siteLanguages.status, 'active'))
    .orderBy(desc(siteLanguages.isDefault), asc(siteLanguages.sortOrder), asc(siteLanguages.name));

  return rows
    .map((row) => ({
      code: row.code,
      name: row.name,
      nativeName: row.nativeName,
      region: row.region,
      direction: row.direction as StorefrontLanguage['direction'],
      countryCodes: row.countryCodes ?? [],
      currencyCode: row.currencyCode,
      isDefault: row.isDefault,
      sortOrder: row.sortOrder,
    }))
    .sort((left, right) => {
      if (left.isDefault !== right.isDefault) return left.isDefault ? -1 : 1;
      if (left.sortOrder !== right.sortOrder) return left.sortOrder - right.sortOrder;
      return left.name.localeCompare(right.name);
    });
}
