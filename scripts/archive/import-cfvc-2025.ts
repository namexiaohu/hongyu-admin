import '@/lib/env';

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import * as cheerio from 'cheerio';
import { and, eq } from 'drizzle-orm';
import { Agent, fetch as undiciFetch } from 'undici';
import { chromium } from 'playwright';

import { MEDIA_ASSET_TYPE_BACKGROUND, MEDIA_ASSET_TYPE_COVER } from '@/lib/media-assets';
import type { AgendaGroup, SpeakerItem, SponsorItem, SummitStat } from '@/lib/summit-content';
import { db } from '@/server/db';
import { mediaAssets, summits, summitTranslations } from '@/server/db/schema';
import { putStorageObject } from '@/server/oss';

const SLUG = 'cfvc-2025';
const BASE = 'https://cfvcseek.com';
const APPLY = process.argv.includes('--apply');
const FORCE = process.argv.includes('--force');

const SCRAPE_URLS = {
  home: `${BASE}/`,
  about: `${BASE}/cfvc/about-cfvc`,
  info2025: `${BASE}/cfvc/2025-cfvc`,
  lecturer: `${BASE}/lecturer/lecturer`,
  sponsorship: `${BASE}/sponsorship`,
} as const;

const FIXED_MEDIA = {
  cover: `${BASE}/upload/2025-03/174114216953217900.png`,
  background: `${BASE}/upload/2025-03/174194143900835800.jpg`,
  venue: `${BASE}/upload/2025-03/174235566744352600.jpg`,
} as const;

const DAY_DATES = ['Sep 11', 'Sep 12', 'Sep 13'] as const;

type MissingReport = {
  emptyFields: string[];
  r2UploadFailures: { field: string; sourceUrl: string; error: string }[];
  partialSpeakers: { name: string; missing: string[] }[];
  partialSponsors: { name: string; missing: string[] }[];
};

type ScrapedPages = Record<keyof typeof SCRAPE_URLS, string>;

type ParsedSpeaker = SpeakerItem & { avatarUrl?: string };

type ParsedSponsor = Omit<SponsorItem, 'logo'> & { logoUrl?: string };

function slugifyId(input: string) {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48);
}

function absUrl(src: string) {
  if (!src || src.startsWith('data:')) return '';
  if (src.startsWith('http')) return src;
  return `${BASE}${src.startsWith('/') ? '' : '/'}${src}`;
}

function cleanText(input: string) {
  return input.replace(/\s+/g, ' ').replace(/\u00a0/g, ' ').trim();
}

function htmlToPlainParagraphs(html: string) {
  const $ = cheerio.load(`<div>${html}</div>`);
  return $('p')
    .map((_, el) => cleanText($(el).text()))
    .get()
    .filter(Boolean)
    .join('\n\n');
}

function splitTimeRange(raw: string) {
  const normalized = cleanText(raw).replace(/\u2013/g, '-');
  const parts = normalized.split('-').map((p) => p.trim());
  if (parts.length >= 2) return { startTime: parts[0], endTime: parts.slice(1).join('-').trim() };
  return { startTime: normalized, endTime: '' };
}

async function fetchPages(): Promise<ScrapedPages> {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();
  const out = {} as ScrapedPages;

  for (const [key, url] of Object.entries(SCRAPE_URLS)) {
    console.log(`抓取: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle', timeout: 120000 });
    await page.waitForTimeout(2000);
    out[key as keyof typeof SCRAPE_URLS] = await page.content();
  }

  await browser.close();
  return out;
}

function parseStatsFromInfo(html: string): SummitStat[] {
  const $ = cheerio.load(html);
  const stats: SummitStat[] = [];
  $('.fvca_top li').each((_, li) => {
    const valueNum = cleanText($(li).find('.counter').first().text());
    const suffix = cleanText($(li).find('.etl i').first().text());
    const mainLabel = cleanText($(li).find('.etr').first().text());
    const subLabel = cleanText($(li).find('.zieb').first().text());
    if (!valueNum) return;
    const value = `${valueNum}${suffix || '+'}`;
    let label = subLabel;
    if (!label) {
      if (/country/i.test(mainLabel)) label = 'Countries';
      else label = mainLabel;
    }
    stats.push({ value, label });
  });
  return stats;
}

function parseDescription(html: string): string {
  const $ = cheerio.load(html);
  const paragraphs: string[] = [];
  $('.fvca_bottom .cc p').each((_, p) => {
    const text = cleanText($(p).text());
    if (text) paragraphs.push(text);
  });
  return paragraphs.join('\n\n');
}

function parseLocationFromHome(html: string) {
  const $ = cheerio.load(html);
  let location = 'Bangkok, Thailand';
  $('.homeA-a li').each((_, li) => {
    const label = cleanText($(li).find('.t1').first().text());
    if (/destination/i.test(label)) {
      location = cleanText($(li).find('.c1').first().text()).replace(',', ', ');
    }
  });
  const venueName = cleanText($('.information_A .bt.font30').first().text());
  const address = cleanText($('.information_A .zo.font22').first().text());
  return {
    location,
    address: [venueName, address].filter(Boolean).join(', '),
  };
}

function parseTransportation(html: string): string {
  const $ = cheerio.load(html);
  const lines: string[] = [];
  $('.homeE .koumo .gundong li').each((_, li) => {
    const title = cleanText($(li).find('.t').first().text());
    const detail = cleanText($(li).find('.o').first().text());
    if (title && detail) lines.push(`${title}: ${detail}`);
  });
  return [...new Set(lines)].join('\n');
}

function parseAgenda(html: string): AgendaGroup[] {
  const $ = cheerio.load(html);
  const boxes = $('.homeD .tabBox > .box').toArray();
  const groups: AgendaGroup[] = [];

  const parseBoxItems = (box: cheerio.Element) => {
    const items: AgendaGroup['items'] = [];
    $(box).find('.homeD-d.pc ul > li').each((idx, li) => {
      const timeRaw = cleanText($(li).find('.t1 span').first().text() || $(li).find('.t1').first().text());
      const title = cleanText($(li).find('.t2').first().text());
      const speaker = cleanText($(li).find('.t3').first().text()).replace(/&amp;/g, '&');
      if (!title) return;
      const { startTime, endTime } = splitTimeRange(timeRaw);
      items.push({
        id: `cfvc2025-item-${slugifyId(title)}-${idx}`,
        startTime,
        endTime,
        title,
        desc: '',
        speaker,
      });
    });
    return items;
  };

  for (let i = 0; i < Math.min(3, boxes.length); i++) {
    const items = parseBoxItems(boxes[i]);
    groups.push({
      id: `cfvc2025-day-${i + 1}`,
      dayLabel: `DAY ${i + 1} · ${DAY_DATES[i]}`,
      groupTitle: `Day ${String(i + 1).padStart(2, '0')}`,
      items,
    });
  }

  const practicalBox = boxes[3];
  if (practicalBox && groups[2]) {
    const practicalItems = parseBoxItems(practicalBox).map((item, idx) => ({
      ...item,
      id: `cfvc2025-practical-${idx + 1}`,
    }));
    groups[2].items.push(...practicalItems);
  }

  return groups;
}

function parseSpeakerRegionsFromHome(html: string): Record<string, string> {
  const $ = cheerio.load(html);
  const map: Record<string, string> = {};
  $('.homeC-c .swiper-slide').each((_, slide) => {
    const name = cleanText($(slide).find('.con .t.font24').first().text());
    const regionHtml = $(slide).find('.con .c.font18').first().html() ?? '';
    const region = cleanText(regionHtml.split('<br>')[0] ?? regionHtml);
    if (name && region && !/coming soon/i.test(name)) map[name] = region;
  });
  return map;
}

function parseSpeakers(html: string, regionMap: Record<string, string>): ParsedSpeaker[] {
  const $ = cheerio.load(html);
  const speakers: ParsedSpeaker[] = [];

  $('.LEATURES_A .ctaiwe > ul > li').each((idx, li) => {
    const name = cleanText($(li).find('.lvwen .b').first().text());
    const credentials = cleanText($(li).find('.lvwen .t').first().text());
    const titleLine = cleanText($(li).find('.turesar > .bt').first().text());
    const avatarSrc = $(li).find('.turesal .img img').first().attr('src') ?? '';
    const researchLines = htmlToPlainParagraphs($(li).find('.sao').first().find('.ao').html() ?? '')
      .split('\n\n')
      .filter(Boolean);
    const research = researchLines.join('\n\n');
    const honors = htmlToPlainParagraphs($(li).find('.sao').eq(1).find('.ao').html() ?? '');

    const descriptionParts = [
      titleLine ? `<p><strong>${titleLine}</strong></p>` : '',
      research ? `<p><strong>Research Specialty</strong></p><p>${research.replace(/\n\n/g, '</p><p>')}</p>` : '',
      honors ? `<p><strong>Honors &amp; Certifications</strong></p><p>${honors.replace(/\n\n/g, '</p><p>')}</p>` : '',
    ].filter(Boolean);

    speakers.push({
      id: `cfvc2025-sp-${slugifyId(name) || String(idx + 1)}`,
      name,
      avatar: '',
      avatarUrl: absUrl(avatarSrc),
      bio: credentials,
      expertise: researchLines[0] ?? 'Veterinary Cardiology',
      region: regionMap[name] ?? '',
      badgeText: 'Lecturer',
      description: descriptionParts.join('') || '',
    });
  });

  return speakers;
}

function inferSponsorName(name: string, intro: string): string {
  if (name) return name;
  const match = intro.match(/^([A-Z][A-Za-z0-9&.\- ]+?)\s+is\b/);
  return match?.[1]?.trim() ?? '';
}

function parseSponsors(html: string): ParsedSponsor[] {
  const $ = cheerio.load(html);
  const sponsors: ParsedSponsor[] = [];

  $('.sponsorship .weio').each((tierIdx, tierBlock) => {
    const badgeText = cleanText($(tierBlock).find('.bqian').first().text());
    let tier: ParsedSponsor['tier'] = 'gold';
    if (/diamond/i.test(badgeText)) tier = 'diamond';
    else if (/silver/i.test(badgeText)) tier = 'silver';

    $(tierBlock).find('.eiobott li').each((idx, li) => {
      const rawName = cleanText($(li).find('.we').first().text());
      const introHtml = $(li).find('.nz').html() ?? '';
      const intro = cleanText(cheerio.load(introHtml).text());
      const logoUrl = absUrl($(li).find('.img img').first().attr('src') ?? '');
      const name = inferSponsorName(rawName, intro);
      if (!name && !intro) return;

      sponsors.push({
        id: `cfvc2025-spn-${tier}-${slugifyId(name || `sponsor-${tierIdx}-${idx}`)}`,
        tier,
        name: name || 'Unknown Sponsor',
        logo: '',
        logoUrl,
        badgeText,
        intro,
      });
    });
  });

  return sponsors;
}

const insecureAgent = new Agent({ connect: { rejectUnauthorized: false } });

async function downloadBuffer(url: string) {
  const res = await undiciFetch(url, {
    headers: { 'user-agent': 'Mozilla/5.0 (compatible; hongyu-cfvc-import/1.0)' },
    dispatcher: insecureAgent,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return {
    buffer: Buffer.from(await res.arrayBuffer()),
    contentType: res.headers.get('content-type') ?? '',
  };
}

type R2UploadResult = { key: string; byteSize: number; contentType: string };

async function uploadToR2(
  key: string,
  url: string,
  report: MissingReport,
  field: string,
): Promise<R2UploadResult | null> {
  try {
    const { buffer, contentType } = await downloadBuffer(url);
    const ext = key.split('.').pop() ?? 'jpg';
    const mime = contentType.includes('png')
      ? 'image/png'
      : contentType.includes('webp')
        ? 'image/webp'
        : ext === 'png'
          ? 'image/png'
          : 'image/jpeg';
    console.log(`  上传 R2: ${key}`);
    const result = await putStorageObject(key, buffer, mime);
    if (!result.ok) throw new Error(result.error);
    return { key: result.key, byteSize: buffer.length, contentType: mime };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    report.r2UploadFailures.push({ field, sourceUrl: url, error });
    return null;
  }
}

async function registerMediaAssetHistory(
  type: typeof MEDIA_ASSET_TYPE_COVER | typeof MEDIA_ASSET_TYPE_BACKGROUND,
  upload: R2UploadResult,
) {
  await db.insert(mediaAssets).values({
    type,
    storageKey: upload.key,
    filename: upload.key.split('/').pop() ?? '',
    contentType: upload.contentType,
    byteSize: upload.byteSize,
  });
}

async function uploadOptionalImage(
  slug: string,
  role: string,
  url: string | undefined,
  report: MissingReport,
  cache: Map<string, string>,
): Promise<string> {
  if (!url) return '';
  const cacheKey = `${role}:${url}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey)!;
  const ext = url.includes('.png') ? 'png' : 'jpg';
  const upload = await uploadToR2(`summits/${slug}/${role}.${ext}`, url, report, role);
  if (upload) cache.set(cacheKey, upload.key);
  return upload?.key ?? '';
}

async function main() {
  const report: MissingReport = {
    emptyFields: [],
    r2UploadFailures: [],
    partialSpeakers: [],
    partialSponsors: [],
  };

  const pages = await fetchPages();
  const outDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'scrape-output');
  await mkdir(outDir, { recursive: true });

  const stats = parseStatsFromInfo(pages.info2025);
  const description = parseDescription(pages.info2025);
  const { location, address } = parseLocationFromHome(pages.home);
  const transportation = parseTransportation(pages.home);
  const agenda = parseAgenda(pages.home);
  const regionMap = parseSpeakerRegionsFromHome(pages.home);
  const speakersParsed = parseSpeakers(pages.lecturer, regionMap);
  const sponsorsParsed = parseSponsors(pages.sponsorship);

  const scale =
    '180+ estimated participants from 20+ countries, featuring 6+ speakers and guests — a super lineup on an international platform covering frontier topics in veterinary cardiology.';

  const parsed = {
    slug: SLUG,
    status: 'registering' as const,
    startDate: '2025-09-11T01:00:00.000Z',
    endDate: '2025-09-13T14:00:00.000Z',
    sortOrder: 15,
    showCoverOnBackground: false,
    title: 'China Forum of Veterinary Cardiology (CFVC) 2025',
    description,
    scale,
    duration: '3 Days',
    location,
    address,
    transportation,
    stats,
    agenda,
    speakers: speakersParsed,
    sponsors: sponsorsParsed,
    videoUrl: '',
  };

  if (!parsed.description) report.emptyFields.push('description');
  if (!parsed.transportation) report.emptyFields.push('transportation');
  if (!parsed.videoUrl) report.emptyFields.push('videoUrl');

  await writeFile(path.join(outDir, 'cfvc-2025-parsed.json'), JSON.stringify(parsed, null, 2), 'utf8');
  console.log('\n解析完成，写入 scrape-output/cfvc-2025-parsed.json');

  if (!APPLY) {
    console.log('\n[dry-run] 未写入数据库。使用 --apply 执行导入，--force 覆盖已有记录。');
    await writeFile(path.join(outDir, 'cfvc-2025-missing-fields.json'), JSON.stringify(report, null, 2), 'utf8');
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  const assetCache = new Map<string, string>();

  const coverUpload = await uploadToR2(
    `summits/${SLUG}/cover.png`,
    FIXED_MEDIA.cover,
    report,
    'cover',
  );
  const backgroundUpload = await uploadToR2(
    `summits/${SLUG}/background.jpg`,
    FIXED_MEDIA.background,
    report,
    'background',
  );
  const venueKey = await uploadOptionalImage(SLUG, 'venue', FIXED_MEDIA.venue, report, assetCache);

  const coverKey = coverUpload?.key ?? '';
  const backgroundKey = backgroundUpload?.key ?? '';
  if (coverUpload) await registerMediaAssetHistory(MEDIA_ASSET_TYPE_COVER, coverUpload);
  if (backgroundUpload) await registerMediaAssetHistory(MEDIA_ASSET_TYPE_BACKGROUND, backgroundUpload);

  const speakers: SpeakerItem[] = [];
  for (const sp of speakersParsed) {
    const avatar = sp.avatarUrl
      ? await uploadOptionalImage(SLUG, `speakers/${sp.id}`, sp.avatarUrl, report, assetCache)
      : '';
    const missing: string[] = [];
    if (!avatar) missing.push('avatar');
    if (!sp.description) missing.push('description');
    if (missing.length) report.partialSpeakers.push({ name: sp.name, missing });
    const { avatarUrl: _drop, ...rest } = sp;
    speakers.push({ ...rest, avatar });
  }

  const sponsors: SponsorItem[] = [];
  for (const sp of sponsorsParsed) {
    const logo = sp.logoUrl
      ? await uploadOptionalImage(SLUG, `sponsors/${sp.id}`, sp.logoUrl, report, assetCache)
      : '';
    if (!logo) report.partialSponsors.push({ name: sp.name, missing: ['logo'] });
    const { logoUrl: _drop, ...rest } = sp;
    sponsors.push({ ...rest, logo });
  }

  const now = new Date();
  const [existing] = await db.select({ id: summits.id }).from(summits).where(eq(summits.slug, SLUG)).limit(1);
  if (existing && !FORCE) {
    console.log(` summit ${SLUG} 已存在，使用 --force 覆盖`);
    return;
  }

  const summitValues = {
    status: parsed.status,
    startDate: new Date(parsed.startDate),
    endDate: new Date(parsed.endDate),
    coverImage: coverKey,
    coverMode: coverKey ? ('upload' as const) : ('' as const),
    coverValue: coverKey,
    videoUrl: '',
    backgroundMode: backgroundKey ? ('upload' as const) : ('' as const),
    backgroundValue: backgroundKey,
    backgroundImage: backgroundKey,
    showCoverOnBackground: false,
    venueImage: venueKey,
    agenda,
    sortOrder: parsed.sortOrder,
    updatedAt: now,
  };

  let summitId = existing?.id;
  if (existing) {
    await db.update(summits).set(summitValues).where(eq(summits.id, existing.id));
  } else {
    const [inserted] = await db.insert(summits).values({ slug: SLUG, ...summitValues }).returning({ id: summits.id });
    summitId = inserted.id;
  }

  if (!summitId) throw new Error('upsert summit failed');

  const translationValues = {
    title: parsed.title,
    description: parsed.description,
    scale: parsed.scale,
    duration: parsed.duration,
    location: parsed.location,
    address: parsed.address,
    transportation: parsed.transportation,
    stats,
    speakers,
    sponsors,
    updatedAt: now,
  };

  const [existT] = await db
    .select({ id: summitTranslations.id })
    .from(summitTranslations)
    .where(and(eq(summitTranslations.summitId, summitId), eq(summitTranslations.locale, 'en')))
    .limit(1);

  if (existT) {
    await db.update(summitTranslations).set(translationValues).where(eq(summitTranslations.id, existT.id));
  } else {
    await db.insert(summitTranslations).values({ summitId, locale: 'en', ...translationValues });
  }

  await writeFile(path.join(outDir, 'cfvc-2025-missing-fields.json'), JSON.stringify(report, null, 2), 'utf8');

  console.log(`\n已导入 ${SLUG}（locale=en, status=registering）`);
  console.log(`  议程: ${agenda.length} 天, ${agenda.reduce((n, g) => n + g.items.length, 0)} 条目`);
  console.log(`  嘉宾: ${speakers.length}, 赞助: ${sponsors.length}`);
  console.log('\n缺失字段报告:');
  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
