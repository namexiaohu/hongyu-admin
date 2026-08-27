import 'server-only';

import { and, eq, inArray } from 'drizzle-orm';

import {
  type AdminCompanyProfile,
  type AdminCompanyProfilePutInput,
  type AdminCompanyProfileTranslation,
  adminCompanyProfilePutSchema,
  alignManagementTeamStructure,
  compactLabelValues,
  compactManagementTeam,
  compactOffices,
  compactPublicFiles,
  translationHasContent,
} from '@/lib/company-profile';
import { shouldPersistLocaleDraft } from '@/lib/locale-draft-persistence';
import { toOssStorageKey } from '@/lib/oss-asset-url';
import { db } from '@/server/db';
import { companyProfileTranslations, companyProfiles } from '@/server/db/schema';
import { getDefaultSiteLanguageCode } from '@/server/admin/site-locale';

function toIso(value: Date) {
  return value.toISOString();
}

function mapTranslation(row: typeof companyProfileTranslations.$inferSelect): AdminCompanyProfileTranslation {
  return {
    id: row.id,
    profileId: row.profileId,
    locale: row.locale,
    companyName: row.companyName,
    slogan: row.slogan,
    positioning: row.positioning,
    copyright: row.copyright,
    contactPhone: row.contactPhone,
    address: row.address,
    businessHours: row.businessHours,
    businessHotline: row.businessHotline,
    basicInfo: compactLabelValues(row.basicInfo),
    managementTeam: compactManagementTeam(row.managementTeam).map((member) => ({
      ...member,
      avatarUrl: member.avatarUrl,
    })),
    offices: compactOffices(row.offices),
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

function mapProfile(
  row: typeof companyProfiles.$inferSelect,
  translations: Array<typeof companyProfileTranslations.$inferSelect>,
): AdminCompanyProfile {
  return {
    id: row.id,
    companyEmail: row.companyEmail,
    businessEmail: row.businessEmail,
    website: row.website,
    icpNumber: row.icpNumber,
    publicFiles: compactPublicFiles(row.publicFiles),
    translations: translations.map(mapTranslation),
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

async function ensureCompanyProfileRow() {
  const [existing] = await db.select().from(companyProfiles).limit(1);
  if (existing) return existing;

  const [inserted] = await db
    .insert(companyProfiles)
    .values({
      companyEmail: '',
      businessEmail: '',
      website: '',
      icpNumber: '',
      publicFiles: [],
    })
    .returning();

  if (!inserted) {
    throw new Error('Failed to create company profile');
  }

  return inserted;
}

export async function getAdminCompanyProfile(): Promise<AdminCompanyProfile> {
  const row = await ensureCompanyProfileRow();
  const translations = await db
    .select()
    .from(companyProfileTranslations)
    .where(eq(companyProfileTranslations.profileId, row.id));
  return mapProfile(row, translations);
}

export async function updateAdminCompanyProfile(input: unknown): Promise<AdminCompanyProfile> {
  const parsed: AdminCompanyProfilePutInput = adminCompanyProfilePutSchema.parse(input);
  const defaultLocale = await getDefaultSiteLanguageCode();
  const row = await ensureCompanyProfileRow();

  const publicFiles = compactPublicFiles(parsed.publicFiles).map((file) => ({
    name: file.name || file.url.split('/').pop() || 'file',
    url: toOssStorageKey(file.url),
  }));

  await db
    .update(companyProfiles)
    .set({
      companyEmail: parsed.companyEmail.trim(),
      businessEmail: parsed.businessEmail.trim(),
      website: parsed.website.trim(),
      icpNumber: parsed.icpNumber.trim(),
      publicFiles,
      updatedAt: new Date(),
    })
    .where(eq(companyProfiles.id, row.id));

  const defaultTranslation = parsed.translations.find((item) => item.locale === defaultLocale)
    ?? parsed.translations[0];
  const structureSource = compactManagementTeam(defaultTranslation?.managementTeam);

  const keepLocales: string[] = [];

  for (const translation of parsed.translations) {
    const alignedTeam = translation.locale === defaultLocale
      ? structureSource
      : alignManagementTeamStructure(structureSource, translation.managementTeam);

    const persist = shouldPersistLocaleDraft({
      locale: translation.locale,
      defaultLocale,
      primaryText: translation.companyName,
    }) || (translation.locale !== defaultLocale && translationHasContent({
      ...translation,
      managementTeam: alignedTeam,
    }));

    if (!persist) continue;
    keepLocales.push(translation.locale);

    const payload = {
      companyName: translation.companyName.trim(),
      slogan: translation.slogan.trim(),
      positioning: translation.positioning.trim(),
      copyright: translation.copyright.trim(),
      contactPhone: translation.contactPhone.trim(),
      address: translation.address.trim(),
      businessHours: translation.businessHours.trim(),
      businessHotline: translation.businessHotline.trim(),
      basicInfo: compactLabelValues(translation.basicInfo),
      managementTeam: compactManagementTeam(alignedTeam).map((member) => ({
        ...member,
        avatarUrl: toOssStorageKey(member.avatarUrl),
      })),
      offices: compactOffices(translation.offices).map((office) => ({
        ...office,
        coverImage: toOssStorageKey(office.coverImage),
      })),
      updatedAt: new Date(),
    };

    const [existing] = await db
      .select({ id: companyProfileTranslations.id })
      .from(companyProfileTranslations)
      .where(and(
        eq(companyProfileTranslations.profileId, row.id),
        eq(companyProfileTranslations.locale, translation.locale),
      ))
      .limit(1);

    if (existing) {
      await db
        .update(companyProfileTranslations)
        .set(payload)
        .where(eq(companyProfileTranslations.id, existing.id));
    } else {
      await db.insert(companyProfileTranslations).values({
        profileId: row.id,
        locale: translation.locale,
        ...payload,
      });
    }
  }

  const existingRows = await db
    .select({ id: companyProfileTranslations.id, locale: companyProfileTranslations.locale })
    .from(companyProfileTranslations)
    .where(eq(companyProfileTranslations.profileId, row.id));

  const staleIds = existingRows
    .filter((item) => !keepLocales.includes(item.locale))
    .map((item) => item.id);

  if (staleIds.length) {
    await db.delete(companyProfileTranslations).where(inArray(companyProfileTranslations.id, staleIds));
  }

  return getAdminCompanyProfile();
}
