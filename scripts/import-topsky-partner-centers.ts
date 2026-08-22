import '@/lib/env';

import { createHash } from 'node:crypto';
import path from 'node:path';

import { and, asc, eq, notInArray } from 'drizzle-orm';

import { MEDIA_ASSET_TYPE_PARTNER_CENTER_BACKGROUND } from '@/lib/partner-center-background-presets';
import type { CenterRegion } from '@/lib/partner-center-content';
import { db } from '@/server/db';
import {
  mediaAssets,
  partnerCenters,
  partnerCenterSurgeons,
  partnerCenterTranslations,
  surgeons,
} from '@/server/db/schema';
import { putStorageObject } from '@/server/oss';

const SITE_ID = '1751938991030050816';
const HOST = 'view.topsky.com';
const API_BASE = 'https://napi-p.topsky.com/pages/getData';
const PAGE_PATH = '/v-clamp-center';
const LOCALES = ['en', 'zh-CN'] as const;
const APPLY = process.argv.includes('--apply');
const FORCE_MEDIA = process.argv.includes('--force');

type ConfigNode = {
  dataSource?: {
    text?: string;
    template?: string[];
    tabData?: Record<string, { title?: string; name?: string; label?: string; key?: string }> | Array<{
      title?: string;
      name?: string;
      label?: string;
      key?: string;
    }>;
    settingValues?: {
      tabData?: Record<string, { title?: string; name?: string; label?: string; key?: string }> | Array<{
        title?: string;
        name?: string;
        label?: string;
        key?: string;
      }>;
      config?: Record<string, ConfigNode>;
      sourceConfig?: unknown;
    };
  };
};

type GetDataResponse = {
  attributes?: { config?: Record<string, ConfigNode> };
  errorMessage?: string;
};

type ParsedCenter = {
  country: string;
  city: string;
  name: string;
  address: string;
  phone: string;
  website: string;
  imageUrl: string;
  region: CenterRegion;
  location: string;
  badgeText: string;
  description: string;
  slug: string;
  sortOrder: number;
};

const COUNTRY_TO_REGION: Record<string, CenterRegion> = {
  USA: 'north-america',
  Mexico: 'latin-america',
  Australia: 'oceania',
  UAE: 'middle-east-africa',
  'South Korea': 'asia-pacific',
  China: 'asia-pacific',
  Thailand: 'asia-pacific',
  Japan: 'asia-pacific',
  Malaysia: 'asia-pacific',
  India: 'asia-pacific',
  Singapore: 'asia-pacific',
  Spain: 'europe',
  Italy: 'europe',
  France: 'europe',
  UK: 'europe',
  Swiss: 'europe',
  Portugal: 'europe',
  Germany: 'europe',
};

const COUNTRY_ALIASES = new Set(
  [
    'usa',
    'uk',
    'uae',
    'swiss',
    'switzerland',
    'korea',
    'south korea',
    'china',
    'thailand',
    'japan',
    'malaysia',
    'india',
    'singapore',
    'spain',
    'italy',
    'france',
    'portugal',
    'germany',
    'australia',
    'mexico',
    'taiwan',
    'hongkong',
    'hong kong',
    'united arab emirates',
  ].map((s) => s.toLowerCase()),
);

const mediaCache = new Map<string, string>();

function mimeFromExtension(ext: string) {
  switch (ext.toLowerCase()) {
    case '.png':
      return 'image/png';
    case '.webp':
      return 'image/webp';
    case '.gif':
      return 'image/gif';
    case '.svg':
      return 'image/svg+xml';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    default:
      return 'image/jpeg';
  }
}

function extensionFromUrl(url: string, contentType?: string | null) {
  try {
    const pathname = decodeURIComponent(new URL(url).pathname);
    const ext = path.extname(pathname).toLowerCase();
    if (ext && ext.length <= 5) return ext === '.jpeg' ? '.jpg' : ext;
  } catch {
    // ignore
  }
  if (contentType?.includes('png')) return '.png';
  if (contentType?.includes('webp')) return '.webp';
  if (contentType?.includes('gif')) return '.gif';
  return '.jpg';
}

function decodeEntities(html: string) {
  return html
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&eacute;/gi, 'é')
    .replace(/&Eacute;/gi, 'É')
    .replace(/&acirc;/gi, 'â')
    .replace(/&aacute;/gi, 'á')
    .replace(/&iacute;/gi, 'í')
    .replace(/&oacute;/gi, 'ó')
    .replace(/&uacute;/gi, 'ú')
    .replace(/&ntilde;/gi, 'ñ')
    .replace(/&auml;/gi, 'ä')
    .replace(/&ouml;/gi, 'ö')
    .replace(/&uuml;/gi, 'ü')
    .replace(/&Auml;/gi, 'Ä')
    .replace(/&Ouml;/gi, 'Ö')
    .replace(/&Uuml;/gi, 'Ü')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(Number.parseInt(h, 16)));
}

function stripTags(html: string) {
  return decodeEntities(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function normalizeName(value: string) {
  return normalizeWhitespace(
    value
      .replace(/[，]/g, ',')
      .replace(/\s*,\s*/g, ', ')
      .replace(/\s{2,}/g, ' '),
  );
}

function slugify(value: string) {
  const ascii = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return ascii.slice(0, 60) || 'partner-center';
}

function regionForCountry(country: string): CenterRegion {
  return COUNTRY_TO_REGION[country] ?? 'asia-pacific';
}

function extractCityFromAddress(address: string, country: string): string | null {
  const cleaned = normalizeWhitespace(address);
  if (!cleaned) return null;

  const parts = cleaned
    .split(/[,|，]/)
    .map((p) => normalizeWhitespace(p))
    .filter(Boolean);

  const countryLower = country.toLowerCase();
  const candidates = parts.filter((part) => {
    const lower = part.toLowerCase();
    if (COUNTRY_ALIASES.has(lower)) return false;
    if (lower.includes(countryLower)) return false;
    if (/^\d/.test(part)) return false;
    if (/^(floor|fl\.|room|no\.|#|suite)/i.test(part)) return false;
    if (part.length < 2 || part.length > 40) return false;
    if (/\d{4,}/.test(part) && /[A-Z]{2}\s*\d/.test(part)) return false;
    return /[A-Za-z\u00C0-\u024F]/.test(part);
  });

  // Prefer a mid/late segment that looks like a locality (not street)
  for (let i = candidates.length - 1; i >= 0; i -= 1) {
    const c = candidates[i]!;
    if (!/\d/.test(c) && !/^(rd|road|st|street|ave|blvd|dr|drive|hwy)/i.test(c)) {
      return c.replace(/\s+(USA|Australia|France|Thailand|Japan|China|India|Mexico|Germany|Italy|Spain|Portugal|Singapore|Malaysia|UAE|UK|Swiss)$/i, '').trim();
    }
  }
  return candidates[0] ?? null;
}

function resolveCity(rawCity: string, country: string, address: string) {
  const city = normalizeWhitespace(rawCity);
  if (!city) {
    return extractCityFromAddress(address, country) || country;
  }
  if (COUNTRY_ALIASES.has(city.toLowerCase()) || city.toLowerCase() === country.toLowerCase()) {
    return extractCityFromAddress(address, country) || city;
  }
  return city;
}

function generateBadge(name: string, country: string) {
  const lower = name.toLowerCase();
  if (/university|veterinary teaching hospital|teaching hospital/.test(lower)) {
    return 'University Teaching Hospital';
  }
  if (/referral|specialist|specialty/.test(lower)) {
    return 'Referral Specialty Center';
  }
  if (/cardiolog/.test(lower)) {
    return 'Cardiology Partner Center';
  }
  if (/clinic|clinique|clinica|hospital|centre|center|medical/.test(lower)) {
    return 'V-Clamp Partner Hospital';
  }
  return `V-Clamp Partner · ${country}`;
}

function generateDescription(name: string, city: string, country: string) {
  const place = city && city.toLowerCase() !== country.toLowerCase() ? `${city}, ${country}` : country;
  return `${name} is a V-Clamp partner center in ${place}, providing veterinary cardiology care and interventional heart procedures within Hongyu's global partner network.`;
}

function extractImageUrl(html: string): string {
  const match = html.match(/src=["']([^"']+)["']/i);
  if (!match?.[1]) return '';
  let url = decodeEntities(match[1]).trim();
  try {
    url = decodeURIComponent(url);
  } catch {
    // keep as-is
  }
  return url;
}

function parseCenterHtml(html: string, country: string): Omit<ParsedCenter, 'slug' | 'sortOrder'> | null {
  if (!html || html.length < 40) return null;

  const imageUrl = extractImageUrl(html);
  if (!imageUrl) return null;

  const strongs = [...html.matchAll(/<strong>([\s\S]*?)<\/strong>/gi)].map((m) => stripTags(m[1] || ''));
  const text = stripTags(html);

  const address =
    text.match(/Address[:：]\s*(.+?)(?=\s*●|\s*Appointments?|\s*Appointment|\s*Website|$)/i)?.[1]?.trim() || '';
  const phone =
    text
      .match(/(?:Appointments?|Appointment)[:：]\s*(.+?)(?=\s*●|\s*Website|\s*Address|$)/i)?.[1]
      ?.trim() || '';
  let website =
    text.match(/Website[:：]\s*((?:https?:\/\/)?[^\s●]+)/i)?.[1]?.trim().replace(/[.,;]+$/, '') || '';
  if (website && !/^https?:\/\//i.test(website)) {
    website = `https://${website}`;
  }

  let rawCity = '';
  let name = '';

  if (strongs.length >= 2) {
    rawCity = strongs[0] || '';
    name = normalizeName(strongs.slice(1).join(' '));
  } else if (strongs.length === 1) {
    const only = strongs[0] || '';
    const afterStrong = normalizeWhitespace(text.replace(only, '').trim());
    const candidateName = normalizeName(afterStrong.split(/●|Address[:：]/i)[0] || '');
    if (candidateName) {
      // Typical card: bold city + plain hospital name
      rawCity = only;
      name = candidateName;
    } else {
      // Bold hospital name only (no separate city label)
      name = normalizeName(only);
      rawCity = '';
    }
  } else {
    name = normalizeName(text.split(/●|Address[:：]/i)[0] || '');
  }

  if (!name) return null;

  const city = resolveCity(rawCity, country, address);
  const region = regionForCountry(country);
  const location = `${country} · ${city}`;

  return {
    country,
    city,
    name,
    address: normalizeWhitespace(address),
    phone: normalizeWhitespace(phone),
    website,
    imageUrl,
    region,
    location,
    badgeText: generateBadge(name, country),
    description: generateDescription(name, city, country),
  };
}

function tabEntries(
  tabData: ConfigNode['dataSource'] extends { tabData?: infer T } ? T : never,
): Array<{ title: string }> {
  if (!tabData) return [];
  const rows = Array.isArray(tabData)
    ? tabData
    : Object.keys(tabData)
        .sort((a, b) => Number(a) - Number(b))
        .map((key) => tabData[key]);

  return rows.map((item) => {
    const raw = (item as { title?: string; name?: string; label?: string } | undefined) || {};
    const title = (raw.name || raw.title || raw.label || 'Unknown').trim();
    return { title };
  });
}

function findCountryTab(config: Record<string, ConfigNode>) {
  for (const [key, node] of Object.entries(config)) {
    if (!key.startsWith('Tab')) continue;
    const template = node.dataSource?.template;
    const tabData = node.dataSource?.settingValues?.tabData ?? node.dataSource?.tabData;
    if (Array.isArray(template) && template.length > 0 && tabData) {
      return { key, template, tabData };
    }
  }
  return null;
}

async function fetchPageConfig() {
  const url = `${API_BASE}?siteId=${SITE_ID}&host=${HOST}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'user-agent': 'Mozilla/5.0 (compatible; hongyu-partner-centers-import/1.0)',
    },
    body: JSON.stringify({ siteId: SITE_ID, host: HOST, path: PAGE_PATH }),
  });
  if (!response.ok) {
    throw new Error(`getData failed: ${response.status}`);
  }
  const data = (await response.json()) as GetDataResponse;
  if (data.errorMessage) {
    throw new Error(data.errorMessage);
  }
  const config = data.attributes?.config;
  if (!config) {
    throw new Error('Missing page config');
  }
  return config;
}

function parseAllCenters(config: Record<string, ConfigNode>): ParsedCenter[] {
  const tab = findCountryTab(config);
  if (!tab) {
    throw new Error('Country Tab component not found');
  }

  const countries = tabEntries(tab.tabData);
  const results: ParsedCenter[] = [];
  const usedSlugs = new Set<string>();
  let sortOrder = 10;

  tab.template.forEach((contentTabKey, countryIndex) => {
    const country = countries[countryIndex]?.title || 'Unknown';
    const contentTab = config[contentTabKey];
    const grids = contentTab?.dataSource?.template || [];

    for (const gridKey of grids) {
      const grid = config[gridKey];
      const cells = grid?.dataSource?.settingValues?.config || {};

      for (const cell of Object.values(cells)) {
        const textKeys = cell?.dataSource?.template || [];
        for (const textKey of textKeys) {
          if (!String(textKey).startsWith('Text')) continue;
          const html = config[textKey]?.dataSource?.text || '';
          const parsed = parseCenterHtml(html, country);
          if (!parsed) continue;

          let slug = slugify(parsed.name);
          if (usedSlugs.has(slug)) {
            slug = slugify(`${parsed.name}-${parsed.city}-${country}`);
          }
          if (usedSlugs.has(slug)) {
            slug = `${slug}-${createHash('sha1').update(parsed.imageUrl).digest('hex').slice(0, 6)}`;
          }
          usedSlugs.add(slug);

          results.push({
            ...parsed,
            slug,
            sortOrder,
          });
          sortOrder += 10;
        }
      }
    }
  });

  return results;
}

async function uploadBackground(slug: string, imageUrl: string) {
  const trimmed = imageUrl.trim();
  if (!FORCE_MEDIA && mediaCache.has(trimmed)) {
    return mediaCache.get(trimmed)!;
  }

  const response = await fetch(trimmed, {
    headers: { 'user-agent': 'Mozilla/5.0 (compatible; hongyu-partner-centers-import/1.0)' },
  });
  if (!response.ok) {
    throw new Error(`Download failed ${response.status}: ${trimmed}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  const ext = extensionFromUrl(trimmed, response.headers.get('content-type'));
  const key = `partner-centers/${slug}/background${ext}`;
  const result = await putStorageObject(key, buffer, mimeFromExtension(ext));
  if (!result.ok) {
    throw new Error(result.error);
  }
  mediaCache.set(trimmed, result.key);
  return result.key;
}

async function createBackgroundMediaAsset(input: {
  storageKey: string;
  filename: string;
  contentType: string;
}) {
  const [inserted] = await db
    .insert(mediaAssets)
    .values({
      type: MEDIA_ASSET_TYPE_PARTNER_CENTER_BACKGROUND,
      storageKey: input.storageKey,
      filename: input.filename,
      contentType: input.contentType,
      byteSize: 0,
    })
    .returning({ id: mediaAssets.id });
  return inserted;
}

function shuffle<T>(items: T[]) {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j]!, next[i]!];
  }
  return next;
}

function pickSurgeonCount(max: number) {
  if (max <= 0) return 0;
  if (max === 1) return 1;
  const preferred = 2 + Math.floor(Math.random() * 3);
  return Math.min(max, preferred);
}

async function linkSurgeons(centerIds: Array<{ id: string; slug: string }>) {
  const surgeonRows = await db
    .select({ id: surgeons.id, slug: surgeons.slug })
    .from(surgeons)
    .orderBy(asc(surgeons.sortOrder), asc(surgeons.slug));

  if (!surgeonRows.length) {
    console.warn('警告：没有术者数据，跳过关联');
    return;
  }

  await db.delete(partnerCenterSurgeons);

  let linkCount = 0;
  const surgeonLinkCounts = new Map<string, number>();

  for (const center of centerIds) {
    const count = pickSurgeonCount(surgeonRows.length);
    const picked = shuffle(surgeonRows).slice(0, count);
    if (!picked.length) continue;

    await db.insert(partnerCenterSurgeons).values(
      picked.map((surgeon, index) => ({
        centerId: center.id,
        surgeonId: surgeon.id,
        sortOrder: (index + 1) * 10,
      })),
    );

    linkCount += picked.length;
    for (const surgeon of picked) {
      surgeonLinkCounts.set(surgeon.id, (surgeonLinkCounts.get(surgeon.id) ?? 0) + 1);
    }
  }

  const orphanSurgeons = surgeonRows.filter((row) => !surgeonLinkCounts.has(row.id));
  if (orphanSurgeons.length) {
    console.log(`补挂未关联术者 ${orphanSurgeons.length} 名…`);
    for (const surgeon of orphanSurgeons) {
      const center = centerIds[Math.floor(Math.random() * centerIds.length)]!;
      await db
        .insert(partnerCenterSurgeons)
        .values({
          centerId: center.id,
          surgeonId: surgeon.id,
          sortOrder: 999,
        })
        .onConflictDoNothing();
      linkCount += 1;
    }
  }

  console.log(`术者关联完成：${linkCount} 条`);
}

async function upsertCenter(center: ParsedCenter, backgroundKey: string, assetId: string) {
  const now = new Date();
  const [existing] = await db
    .select({ id: partnerCenters.id })
    .from(partnerCenters)
    .where(eq(partnerCenters.slug, center.slug))
    .limit(1);

  let centerId = existing?.id;

  const centerValues = {
    region: center.region,
    email: '',
    website: center.website,
    coverImage: '',
    gallery: [] as [],
    videoUrl: '',
    logo: '',
    backgroundImage: backgroundKey,
    backgroundMode: 'upload' as const,
    backgroundValue: assetId,
    showCoverOnBackground: false,
    sortOrder: center.sortOrder,
    updatedAt: now,
  };

  if (existing) {
    await db.update(partnerCenters).set(centerValues).where(eq(partnerCenters.id, existing.id));
  } else {
    const [inserted] = await db
      .insert(partnerCenters)
      .values({
        slug: center.slug,
        ...centerValues,
      })
      .returning({ id: partnerCenters.id });
    centerId = inserted.id;
  }

  if (!centerId) {
    throw new Error(`Failed to upsert center ${center.slug}`);
  }

  for (const locale of LOCALES) {
    const translationValues = {
      name: center.name,
      description: center.description,
      detailDescription: '',
      location: center.location,
      badgeText: center.badgeText,
      address: center.address,
      businessHours: '',
      contact: center.phone,
      website: center.website,
      tags: [] as string[],
      stats: [] as [],
      cooperationInfo: [] as [],
      updatedAt: now,
    };

    const [existT] = await db
      .select({ id: partnerCenterTranslations.id })
      .from(partnerCenterTranslations)
      .where(
        and(
          eq(partnerCenterTranslations.centerId, centerId),
          eq(partnerCenterTranslations.locale, locale),
        ),
      )
      .limit(1);

    if (existT) {
      await db
        .update(partnerCenterTranslations)
        .set(translationValues)
        .where(eq(partnerCenterTranslations.id, existT.id));
    } else {
      await db.insert(partnerCenterTranslations).values({
        centerId,
        locale,
        ...translationValues,
      });
    }
  }

  return centerId;
}

async function main() {
  console.log(`模式: ${APPLY ? 'APPLY（写库）' : 'DRY-RUN（仅预览）'}`);
  console.log(`拉取 ${HOST}${PAGE_PATH} …`);

  const config = await fetchPageConfig();
  const centers = parseAllCenters(config);

  const byCountry = new Map<string, number>();
  for (const center of centers) {
    byCountry.set(center.country, (byCountry.get(center.country) ?? 0) + 1);
  }

  console.log(`\n解析到 ${centers.length} 个合作中心：`);
  for (const [country, count] of byCountry) {
    console.log(`  ${country}: ${count}`);
  }

  console.log('\n样例（前 3 条）：');
  for (const center of centers.slice(0, 3)) {
    console.log(
      JSON.stringify(
        {
          slug: center.slug,
          name: center.name,
          location: center.location,
          region: center.region,
          address: center.address,
          phone: center.phone,
          website: center.website,
          badgeText: center.badgeText,
          description: center.description,
          imageUrl: center.imageUrl,
        },
        null,
        2,
      ),
    );
  }

  if (!APPLY) {
    console.log('\nDry-run 完成。加 --apply 执行写入、R2 上传、术者关联与旧数据清理。');
    return;
  }

  if (!centers.length) {
    throw new Error('没有可导入的合作中心');
  }

  const imported: Array<{ id: string; slug: string }> = [];

  for (const center of centers) {
    console.log(`\n处理: ${center.slug}`);
    const backgroundKey = await uploadBackground(center.slug, center.imageUrl);
    const ext = path.extname(backgroundKey) || '.jpg';
    const asset = await createBackgroundMediaAsset({
      storageKey: backgroundKey,
      filename: `${center.slug}-background${ext}`,
      contentType: mimeFromExtension(ext),
    });
    const centerId = await upsertCenter(center, backgroundKey, asset.id);
    imported.push({ id: centerId, slug: center.slug });
    console.log(`  已写入 (${center.country} · ${center.city})`);
  }

  console.log('\n关联认证术者…');
  await linkSurgeons(imported);

  const importedSlugs = imported.map((item) => item.slug);
  const deleted = await db
    .delete(partnerCenters)
    .where(notInArray(partnerCenters.slug, importedSlugs))
    .returning({ slug: partnerCenters.slug });

  console.log(`\n已清除旧合作中心 ${deleted.length} 个:`);
  for (const row of deleted) {
    console.log(`  - ${row.slug}`);
  }

  console.log(`\n完成：导入 ${imported.length} 个合作中心，清除旧数据 ${deleted.length} 个。`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
