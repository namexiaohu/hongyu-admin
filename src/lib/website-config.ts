import { z } from 'zod';

import {
  compactListHeroBoards,
  createEmptyListHeroBoards,
  listHeroBoardsPutSchema,
  resolveStorefrontListHeroBoards,
  type AdminListHeroBoard,
  type AdminListHeroBoardsRecord,
  type ListHeroBoardKey,
  type ListHeroBoardsRecord,
  type StorefrontListHeroBoard,
  type StorefrontListHeroBoardsRecord,
} from '@/lib/list-hero-board';

export type {
  AdminListHeroBoard,
  AdminListHeroBoardsRecord,
  ListHeroBoardKey,
  ListHeroBoardsRecord,
  StorefrontListHeroBoard,
  StorefrontListHeroBoardsRecord,
};

export type NavItemLocale = { name: string };
export type NavColumnLocale = { name: string };

export type NavItem = {
  id: string;
  href: string;
  name: string;
  locales?: Record<string, NavItemLocale>;
};

export type NavColumn = {
  id: string;
  /** Optional top-level link; when set (often with empty items), header renders as a direct `<a>`. */
  href?: string;
  name: string;
  items: NavItem[];
  locales?: Record<string, NavColumnLocale>;
};

export type AdminWebsiteConfig = {
  id: string;
  headerNavColumns: NavColumn[];
  footerNavColumns: NavColumn[];
  listHeroBoards: AdminListHeroBoardsRecord;
  createdAt: string;
  updatedAt: string;
};

export type StorefrontNavItem = {
  id: string;
  href: string;
  name: string;
};

export type StorefrontNavColumn = {
  id: string;
  href: string;
  name: string;
  items: StorefrontNavItem[];
};

export type StorefrontWebsiteConfig = {
  locale: string;
  headerNavColumns: StorefrontNavColumn[];
  footerNavColumns: StorefrontNavColumn[];
  listHeroBoards: StorefrontListHeroBoardsRecord;
};

const navItemLocaleSchema = z.object({
  name: z.string().optional().default(''),
});

const navItemSchema = z.object({
  id: z.string().optional().default(''),
  href: z.string().optional().default(''),
  name: z.string().optional().default(''),
  locales: z.record(z.string(), navItemLocaleSchema).optional(),
});

const navColumnLocaleSchema = z.object({
  name: z.string().optional().default(''),
});

const navColumnSchema = z.object({
  id: z.string().optional().default(''),
  href: z.string().optional().default(''),
  name: z.string().optional().default(''),
  items: z.array(navItemSchema).optional().default([]),
  locales: z.record(z.string(), navColumnLocaleSchema).optional(),
});

export const adminWebsiteConfigPutSchema = z.object({
  headerNavColumns: z.array(navColumnSchema).optional(),
  footerNavColumns: z.array(navColumnSchema).optional(),
  listHeroBoards: listHeroBoardsPutSchema.optional(),
});

export type AdminWebsiteConfigPutInput = z.infer<typeof adminWebsiteConfigPutSchema>;

export function createNavId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function compactNavItems(rows: NavItem[] | undefined): NavItem[] {
  return (rows ?? [])
    .map((row, index) => {
      const locales = Object.fromEntries(
        Object.entries(row.locales ?? {})
          .map(([locale, copy]) => [locale, { name: copy?.name?.trim() ?? '' }] as const)
          .filter(([, copy]) => Boolean(copy.name)),
      );
      return {
        id: row.id?.trim() || `nav-item-${index + 1}`,
        href: row.href?.trim() ?? '',
        name: row.name?.trim() ?? '',
        ...(Object.keys(locales).length ? { locales } : {}),
      };
    })
    .filter((row) => row.name || row.href || Object.keys(row.locales ?? {}).length);
}

export function compactNavColumns(rows: NavColumn[] | undefined): NavColumn[] {
  return (rows ?? [])
    .map((row, index) => {
      const locales = Object.fromEntries(
        Object.entries(row.locales ?? {})
          .map(([locale, copy]) => [locale, { name: copy?.name?.trim() ?? '' }] as const)
          .filter(([, copy]) => Boolean(copy.name)),
      );
      return {
        id: row.id?.trim() || `nav-column-${index + 1}`,
        href: row.href?.trim() ?? '',
        name: row.name?.trim() ?? '',
        items: compactNavItems(row.items),
        ...(Object.keys(locales).length ? { locales } : {}),
      };
    })
    .filter((row) => row.name || row.href || row.items.length || Object.keys(row.locales ?? {}).length);
}

/** Deep clone nav columns including nested items and locales. */
export function cloneNavColumns(rows: NavColumn[] | undefined): NavColumn[] {
  return compactNavColumns(rows).map((column) => ({
    ...column,
    items: column.items.map((item) => ({
      ...item,
      ...(item.locales ? { locales: { ...item.locales } } : {}),
    })),
    ...(column.locales ? { locales: { ...column.locales } } : {}),
  }));
}

/** Footer nav: use stored footer; if empty but header has data, clone header (upgrade fallback). */
export function resolveAdminFooterNavColumns(header: NavColumn[] | undefined, footer: NavColumn[] | undefined): NavColumn[] {
  const compactedFooter = compactNavColumns(footer);
  if (compactedFooter.length) return compactedFooter;
  const compactedHeader = compactNavColumns(header);
  if (compactedHeader.length) return cloneNavColumns(compactedHeader);
  return [];
}

function localeKeysMatch(left: string, right: string) {
  const a = left.trim().toLowerCase();
  const b = right.trim().toLowerCase();
  if (a === b) return true;
  const ap = a.split('-')[0];
  const bp = b.split('-')[0];
  return Boolean(ap && bp && ap === bp);
}

export function resolveNavName(
  entity: { name: string; locales?: Record<string, { name?: string }> },
  locale: string,
) {
  const exact = entity.locales?.[locale]?.name?.trim();
  if (exact) return exact;
  const match = Object.entries(entity.locales ?? {}).find(([key, copy]) => (
    localeKeysMatch(key, locale) && Boolean(copy?.name?.trim())
  ));
  if (match?.[1]?.name?.trim()) return match[1].name.trim();
  return entity.name?.trim() || '';
}

export function resolveStorefrontNavColumns(raw: NavColumn[] | undefined, locale: string): StorefrontNavColumn[] {
  return compactNavColumns(raw).map((column) => ({
    id: column.id,
    href: column.href?.trim() ?? '',
    name: resolveNavName(column, locale),
    items: column.items.map((item) => ({
      id: item.id,
      href: item.href,
      name: resolveNavName(item, locale),
    })).filter((item) => item.name && item.href),
  })).filter((column) => column.name && (column.href || column.items.length));
}

/** Seed navigation aligned with storefront footer structure (zh default + en/es titles). */
export function getDefaultWebsiteNavColumns(): NavColumn[] {
  return [
    {
      id: 'nav-hongyu',
      name: '竑宇医疗',
      locales: {
        en: { name: 'Hongyu Medical' },
        es: { name: 'Hongyu Medical' },
      },
      items: [
        {
          id: 'nav-hongyu-about',
          href: '/about',
          name: '企业介绍',
          locales: { en: { name: 'About Us' }, es: { name: 'Sobre nosotros' } },
        },
        {
          id: 'nav-hongyu-patents',
          href: '/patents',
          name: '技术专利',
          locales: { en: { name: 'Patents' }, es: { name: 'Patentes' } },
        },
        {
          id: 'nav-hongyu-history',
          href: '/history',
          name: '发展历程',
          locales: { en: { name: 'Our History' }, es: { name: 'Nuestra historia' } },
        },
      ],
    },
    {
      id: 'nav-solutions',
      name: '解决方案',
      locales: {
        en: { name: 'Solutions' },
        es: { name: 'Soluciones' },
      },
      items: [
        {
          id: 'nav-solutions-vclamp',
          href: '/solutions/v-clamp',
          name: 'V-CLAMP',
          locales: { en: { name: 'V-CLAMP' }, es: { name: 'V-CLAMP' } },
        },
        {
          id: 'nav-solutions-sports',
          href: '/solutions/sports-medicine',
          name: '运动医学',
          locales: { en: { name: 'Sports Medicine' }, es: { name: 'Medicina deportiva' } },
        },
        {
          id: 'nav-solutions-cardio',
          href: '/solutions/pacemaker',
          name: '心脏起搏器',
          locales: { en: { name: 'Cardiac Pacemakers' }, es: { name: 'Marcapasos cardíacos' } },
        },
        {
          id: 'nav-solutions-pipeline',
          href: '/solutions/in-research',
          name: '在研产品',
          locales: { en: { name: 'Pipeline' }, es: { name: 'Productos en desarrollo' } },
        },
      ],
    },
    {
      id: 'nav-global',
      name: '全球布局',
      locales: {
        en: { name: 'Global Presence' },
        es: { name: 'Presencia global' },
      },
      items: [
        {
          id: 'nav-global-surgeons',
          href: '/surgeons',
          name: '认证术者',
          locales: { en: { name: 'Certified Surgeons' }, es: { name: 'Cirujanos certificados' } },
        },
        {
          id: 'nav-global-centers',
          href: '/centers',
          name: '合作中心',
          locales: { en: { name: 'Partner Centers' }, es: { name: 'Centros colaboradores' } },
        },
      ],
    },
    {
      id: 'nav-insights',
      name: '前沿资讯',
      locales: {
        en: { name: 'Insights' },
        es: { name: 'Perspectivas' },
      },
      items: [
        {
          id: 'nav-insights-case',
          href: '/insights?category=case',
          name: '病例回顾',
          locales: { en: { name: 'Case Reviews' }, es: { name: 'Revisión de casos' } },
        },
        {
          id: 'nav-insights-paper',
          href: '/insights?category=paper',
          name: '行业论文',
          locales: { en: { name: 'Industry Papers' }, es: { name: 'Artículos del sector' } },
        },
        {
          id: 'nav-insights-experience',
          href: '/insights?category=experience',
          name: '术者经验',
          locales: { en: { name: 'Surgeon Insights' }, es: { name: 'Experiencia quirúrgica' } },
        },
      ],
    },
    {
      id: 'nav-education',
      name: '持续教育',
      locales: {
        en: { name: 'Continuing Education' },
        es: { name: 'Educación continua' },
      },
      items: [
        {
          id: 'nav-education-course',
          href: '/course',
          name: '录播课程',
          locales: { en: { name: 'Recorded Courses' }, es: { name: 'Cursos grabados' } },
        },
        {
          id: 'nav-education-training',
          href: '/training',
          name: '培训计划',
          locales: { en: { name: 'Training Programs' }, es: { name: 'Programas de formación' } },
        },
        {
          id: 'nav-education-summit',
          href: '/summit',
          name: '行业峰会',
          locales: { en: { name: 'Industry Summit' }, es: { name: 'Cumbre del sector' } },
        },
      ],
    },
    {
      id: 'nav-contact',
      name: '联系我们',
      locales: {
        en: { name: 'Contact Us' },
        es: { name: 'Contáctenos' },
      },
      items: [
        {
          id: 'nav-contact-company',
          href: '/company',
          name: '企业信息',
          locales: { en: { name: 'Company Info' }, es: { name: 'Información corporativa' } },
        },
        {
          id: 'nav-contact-contact',
          href: '/contact',
          name: '联系我们',
          locales: { en: { name: 'Contact Us' }, es: { name: 'Contáctenos' } },
        },
        {
          id: 'nav-contact-partnership',
          href: '/partnership',
          name: '商务合作',
          locales: { en: { name: 'Business Partnership' }, es: { name: 'Cooperación comercial' } },
        },
        {
          id: 'nav-contact-media',
          href: '/media',
          name: '海外媒体',
          locales: { en: { name: 'Overseas Media' }, es: { name: 'Medios internacionales' } },
        },
      ],
    },
  ];
}

export const EMPTY_STOREFRONT_WEBSITE_CONFIG: StorefrontWebsiteConfig = {
  locale: '',
  headerNavColumns: [],
  footerNavColumns: [],
  listHeroBoards: resolveStorefrontListHeroBoards(createEmptyListHeroBoards()),
};
