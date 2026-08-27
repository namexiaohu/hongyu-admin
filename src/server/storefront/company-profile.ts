import 'server-only';

import { eq } from 'drizzle-orm';

import {
  type StorefrontCompanyProfile,
  compactLabelValues,
  compactManagementTeam,
  compactOffices,
  compactPublicFiles,
} from '@/lib/company-profile';
import { resolveOssAssetUrl } from '@/lib/oss-asset-url';
import { pickTranslationForDisplay } from '@/lib/pick-translation-for-display';
import { db } from '@/server/db';
import { companyProfileTranslations, companyProfiles } from '@/server/db/schema';
import { getDefaultSiteLanguageCode } from '@/server/admin/site-locale';

export async function getStorefrontCompanyProfile(locale: string): Promise<StorefrontCompanyProfile> {
  const [row] = await db.select().from(companyProfiles).limit(1);
  const defaultLocale = await getDefaultSiteLanguageCode();

  if (!row) {
    return {
      locale: locale || defaultLocale,
      companyName: '',
      slogan: '',
      positioning: '',
      copyright: '',
      companyEmail: '',
      businessEmail: '',
      website: '',
      icpNumber: '',
      contactPhone: '',
      address: '',
      businessHours: '',
      businessHotline: '',
      basicInfo: [],
      managementTeam: [],
      offices: [],
      publicFiles: [],
    };
  }

  const translations = await db
    .select()
    .from(companyProfileTranslations)
    .where(eq(companyProfileTranslations.profileId, row.id));

  const display = pickTranslationForDisplay(translations, locale)
    ?? pickTranslationForDisplay(translations, defaultLocale);

  return {
    locale: display?.locale ?? locale ?? defaultLocale,
    companyName: display?.companyName ?? '',
    slogan: display?.slogan ?? '',
    positioning: display?.positioning ?? '',
    copyright: display?.copyright ?? '',
    companyEmail: row.companyEmail,
    businessEmail: row.businessEmail,
    website: row.website,
    icpNumber: row.icpNumber,
    contactPhone: display?.contactPhone ?? '',
    address: display?.address ?? '',
    businessHours: display?.businessHours ?? '',
    businessHotline: display?.businessHotline ?? '',
    basicInfo: compactLabelValues(display?.basicInfo),
    managementTeam: compactManagementTeam(display?.managementTeam).map((member) => ({
      ...member,
      avatarUrl: resolveOssAssetUrl(member.avatarUrl),
    })),
    offices: compactOffices(display?.offices).map((office) => ({
      ...office,
      coverImage: resolveOssAssetUrl(office.coverImage),
    })),
    publicFiles: compactPublicFiles(row.publicFiles).map((file) => ({
      name: file.name,
      url: resolveOssAssetUrl(file.url),
    })),
  };
}
