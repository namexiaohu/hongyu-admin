import { z } from 'zod';

export type CompanyPublicFile = {
  name: string;
  url: string;
};

export type CompanyLabelValue = {
  label: string;
  value: string;
};

export type CompanyTeamLevel = 'executive' | 'manager' | 'staff';

export type CompanyTeamMember = {
  id: string;
  level: CompanyTeamLevel;
  sortOrder: number;
  name: string;
  title: string;
  email: string;
  contact: string;
  region: string;
  avatarUrl: string;
  supervisorId: string;
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
  managementTeam: CompanyTeamMember[];
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
  managementTeam: CompanyTeamMember[];
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

const teamLevelSchema = z.enum(['executive', 'manager', 'staff']);

const teamMemberSchema = z.object({
  id: z.string().trim().min(1),
  level: teamLevelSchema,
  sortOrder: z.number().int().nonnegative().optional().default(0),
  name: z.string().trim().min(1, '名称必填'),
  title: z.string().optional().default(''),
  email: z.string().optional().default(''),
  contact: z.string().optional().default(''),
  region: z.string().optional().default(''),
  avatarUrl: z.string().optional().default(''),
  supervisorId: z.string().optional().default(''),
}).superRefine((row, ctx) => {
  if (row.level === 'executive') return;
  if (!row.supervisorId?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: '中层与基层必须选择上级',
      path: ['supervisorId'],
    });
  }
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
  managementTeam: z.array(teamMemberSchema).optional().default([]),
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

export function createCompanyTeamMemberId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `team-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function emptyCompanyTeamMember(level: CompanyTeamLevel, sortOrder = 0): CompanyTeamMember {
  return {
    id: createCompanyTeamMemberId(),
    level,
    sortOrder,
    name: '',
    title: '',
    email: '',
    contact: '',
    region: '',
    avatarUrl: '',
    supervisorId: '',
  };
}

export function compactLabelValues(rows: CompanyLabelValue[] | undefined): CompanyLabelValue[] {
  return (rows ?? [])
    .map((row) => ({ label: row.label?.trim() ?? '', value: row.value?.trim() ?? '' }))
    .filter((row) => row.label || row.value);
}

export function compactManagementTeam(rows: CompanyTeamMember[] | undefined): CompanyTeamMember[] {
  const normalized = (rows ?? []).map((row, index) => {
    const level: CompanyTeamLevel = row.level === 'manager' || row.level === 'staff' ? row.level : 'executive';
    return {
      id: row.id?.trim() || createCompanyTeamMemberId(),
      level,
      sortOrder: Number.isFinite(row.sortOrder) ? Number(row.sortOrder) : index,
      name: row.name?.trim() ?? '',
      title: row.title?.trim() ?? '',
      email: row.email?.trim() ?? '',
      contact: row.contact?.trim() ?? '',
      region: row.region?.trim() ?? '',
      avatarUrl: row.avatarUrl?.trim() ?? '',
      supervisorId: level === 'executive' ? '' : (row.supervisorId?.trim() ?? ''),
    };
  }).filter((row) => row.name);

  const byLevel: Record<CompanyTeamLevel, CompanyTeamMember[]> = {
    executive: [],
    manager: [],
    staff: [],
  };
  for (const row of normalized) byLevel[row.level].push(row);

  const ordered = ([
    ...byLevel.executive,
    ...byLevel.manager,
    ...byLevel.staff,
  ]).map((row, index) => ({ ...row, sortOrder: index }));

  return ordered.sort((a, b) => {
    const levelRank = { executive: 0, manager: 1, staff: 2 } as const;
    if (levelRank[a.level] !== levelRank[b.level]) return levelRank[a.level] - levelRank[b.level];
    return a.sortOrder - b.sortOrder;
  }).map((row, index) => ({ ...row, sortOrder: index }));
}

export function membersAtLevel(rows: CompanyTeamMember[] | undefined, level: CompanyTeamLevel) {
  return compactManagementTeam(rows).filter((row) => row.level === level);
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

/** Align non-default locales to default-locale structure; keep translated text fields. */
export function alignManagementTeamStructure(
  source: CompanyTeamMember[] | undefined,
  target: CompanyTeamMember[] | undefined,
): CompanyTeamMember[] {
  const sourceTeam = compactManagementTeam(source);
  const targetById = new Map(compactManagementTeam(target).map((row) => [row.id, row]));
  return sourceTeam.map((row) => {
    const existing = targetById.get(row.id);
    return {
      ...row,
      name: existing?.name?.trim() || row.name,
      title: existing?.title ?? row.title,
      email: existing?.email ?? row.email,
      contact: existing?.contact ?? row.contact,
      region: existing?.region ?? row.region,
      avatarUrl: row.avatarUrl,
      supervisorId: row.supervisorId,
      level: row.level,
      sortOrder: row.sortOrder,
    };
  });
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
  managementTeam?: CompanyTeamMember[];
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
    || compactManagementTeam(input.managementTeam).length
    || compactOffices(input.offices).length,
  );
}
