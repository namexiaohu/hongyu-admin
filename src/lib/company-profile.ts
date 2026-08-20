import { z } from 'zod';

export type CompanyPublicFile = {
  name: string;
  url: string;
};

export type CompanyLabelValue = {
  label: string;
  value: string;
};

export type CompanyTeamMember = {
  title: string;
  name: string;
};

export type CompanyOffice = {
  coverImage: string;
  name: string;
  location: string;
  phone: string;
  contactPerson: string;
  email: string;
};

export type AdminCompanyProfileTranslation = {
  id: string;
  profileId: string;
  locale: string;
  companyName: string;
  slogan: string;
  positioning: string;
  copyright: string;
  contactPhone: string;
  address: string;
  businessHours: string;
  businessHotline: string;
  basicInfo: CompanyLabelValue[];
  executives: CompanyTeamMember[];
  managers: CompanyTeamMember[];
  offices: CompanyOffice[];
  createdAt: string;
  updatedAt: string;
};

export type AdminCompanyProfile = {
  id: string;
  companyEmail: string;
  businessEmail: string;
  website: string;
  icpNumber: string;
  publicFiles: CompanyPublicFile[];
  translations: AdminCompanyProfileTranslation[];
  createdAt: string;
  updatedAt: string;
};

export type StorefrontCompanyProfile = {
  locale: string;
  companyName: string;
  slogan: string;
  positioning: string;
  copyright: string;
  companyEmail: string;
  businessEmail: string;
  website: string;
  icpNumber: string;
  contactPhone: string;
  address: string;
  businessHours: string;
  businessHotline: string;
  basicInfo: CompanyLabelValue[];
  executives: CompanyTeamMember[];
  managers: CompanyTeamMember[];
  offices: Array<CompanyOffice & { coverImage: string }>;
  publicFiles: CompanyPublicFile[];
};

const publicFileSchema = z.object({
  name: z.string().optional().default(''),
  url: z.string().optional().default(''),
});

const labelValueSchema = z.object({
  label: z.string().optional().default(''),
  value: z.string().optional().default(''),
});

const teamMemberSchema = z.object({
  title: z.string().optional().default(''),
  name: z.string().optional().default(''),
});

const officeSchema = z.object({
  coverImage: z.string().optional().default(''),
  name: z.string().optional().default(''),
  location: z.string().optional().default(''),
  phone: z.string().optional().default(''),
  contactPerson: z.string().optional().default(''),
  email: z.string().optional().default(''),
});

export const adminCompanyTranslationSchema = z.object({
  locale: z.string().trim().min(2),
  companyName: z.string().optional().default(''),
  slogan: z.string().optional().default(''),
  positioning: z.string().optional().default(''),
  copyright: z.string().optional().default(''),
  contactPhone: z.string().optional().default(''),
  address: z.string().optional().default(''),
  businessHours: z.string().optional().default(''),
  businessHotline: z.string().optional().default(''),
  basicInfo: z.array(labelValueSchema).optional().default([]),
  executives: z.array(teamMemberSchema).optional().default([]),
  managers: z.array(teamMemberSchema).optional().default([]),
  offices: z.array(officeSchema).optional().default([]),
});

export const adminCompanyProfilePutSchema = z.object({
  companyEmail: z.string().optional().default(''),
  businessEmail: z.string().optional().default(''),
  website: z.string().optional().default(''),
  icpNumber: z.string().optional().default(''),
  publicFiles: z.array(publicFileSchema).optional().default([]),
  translations: z.array(adminCompanyTranslationSchema).optional().default([]),
});

export type AdminCompanyProfilePutInput = z.infer<typeof adminCompanyProfilePutSchema>;

export function compactLabelValues(rows: CompanyLabelValue[] | undefined): CompanyLabelValue[] {
  return (rows ?? [])
    .map((row) => ({ label: row.label?.trim() ?? '', value: row.value?.trim() ?? '' }))
    .filter((row) => row.label || row.value);
}

export function compactTeamMembers(rows: CompanyTeamMember[] | undefined): CompanyTeamMember[] {
  return (rows ?? [])
    .map((row) => ({ title: row.title?.trim() ?? '', name: row.name?.trim() ?? '' }))
    .filter((row) => row.title || row.name);
}

export function compactOffices(rows: CompanyOffice[] | undefined): CompanyOffice[] {
  return (rows ?? [])
    .map((row) => ({
      coverImage: row.coverImage?.trim() ?? '',
      name: row.name?.trim() ?? '',
      location: row.location?.trim() ?? '',
      phone: row.phone?.trim() ?? '',
      contactPerson: row.contactPerson?.trim() ?? '',
      email: row.email?.trim() ?? '',
    }))
    .filter((row) => row.coverImage || row.name || row.location || row.phone || row.contactPerson || row.email);
}

export function compactPublicFiles(rows: CompanyPublicFile[] | undefined): CompanyPublicFile[] {
  return (rows ?? [])
    .map((row) => ({ name: row.name?.trim() ?? '', url: row.url?.trim() ?? '' }))
    .filter((row) => row.url);
}

export function translationHasContent(input: {
  companyName?: string;
  slogan?: string;
  positioning?: string;
  copyright?: string;
  contactPhone?: string;
  address?: string;
  businessHours?: string;
  businessHotline?: string;
  basicInfo?: CompanyLabelValue[];
  executives?: CompanyTeamMember[];
  managers?: CompanyTeamMember[];
  offices?: CompanyOffice[];
}) {
  return Boolean(
    input.companyName?.trim()
    || input.slogan?.trim()
    || input.positioning?.trim()
    || input.copyright?.trim()
    || input.contactPhone?.trim()
    || input.address?.trim()
    || input.businessHours?.trim()
    || input.businessHotline?.trim()
    || compactLabelValues(input.basicInfo).length
    || compactTeamMembers(input.executives).length
    || compactTeamMembers(input.managers).length
    || compactOffices(input.offices).length,
  );
}
