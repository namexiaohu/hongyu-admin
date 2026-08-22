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

const BASE = 'https://cfvcseek.com';
const SHARED_BACKGROUND = `${BASE}/upload/2025-03/174194143900835800.jpg`;
const APPLY = process.argv.includes('--apply');
const FORCE = process.argv.includes('--force');
const YEAR_ARG = process.argv.find((a) => a.startsWith('--year='))?.split('=')[1];

type CfvcPastConfig = {
  year: 2024 | 2021;
  slug: string;
  sortOrder: number;
  title: string;
  coverUrl: string;
  fallbackStartDate: string;
  fallbackEndDate: string;
  fallbackDuration: string;
};

const CONFIGS: CfvcPastConfig[] = [
  {
    year: 2024,
    slug: 'cfvc-2024',
    sortOrder: 14,
    title: 'China Forum of Veterinary Cardiology (CFVC) 2024',
    coverUrl: `${BASE}/upload/2025-03/174115141852216500.png`,
    fallbackStartDate: '2024-10-24T01:00:00.000Z',
    fallbackEndDate: '2024-10-26T14:00:00.000Z',
    fallbackDuration: '3 Days',
  },
  {
    year: 2021,
    slug: 'cfvc-2021',
    sortOrder: 13,
    title: 'China Forum of Veterinary Cardiology (CFVC) 2021',
    coverUrl: `${BASE}/upload/2025-03/174236598305287600.png`,
    fallbackStartDate: '2021-09-06T01:00:00.000Z',
    fallbackEndDate: '2021-09-09T14:00:00.000Z',
    fallbackDuration: '4 Days',
  },
];

type MissingReport = {
  emptyFields: string[];
  skippedOnSource: string[];
  r2UploadFailures: { field: string; sourceUrl: string; error: string }[];
};

function absUrl(src: string) {
  if (!src || src.startsWith('data:')) return '';
  if (src.startsWith('http')) return src;
  return `${BASE}${src.startsWith('/') ? '' : '/'}${src}`;
}

function cleanText(input: string) {
  return input.replace(/\s+/g, ' ').replace(/\u00a0/g, ' ').trim();
}

function escapeHtml(input: string) {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function parseStats(html: string): SummitStat[] {
  const $ = cheerio.load(html);
  const stats: SummitStat[] = [];
  $('.fvca_top li').each((_, li) => {
    const valueNum = cleanText($(li).find('.counter').first().text());
    const suffix = cleanText($(li).find('.etl i').first().text());
    const mainLabel = cleanText($(li).find('.etr').first().text());
    const subLabel = cleanText($(li).find('.zieb').first().text());
    if (!valueNum) return;
    const value = `${valueNum}${suffix || '+'}`;
    let label = mainLabel;
    if (subLabel && subLabel !== mainLabel) {
      label = `${mainLabel} (${subLabel})`;
    }
    stats.push({ value, label });
  });
  return stats;
}

function parseFullDescription(html: string): string {
  const $ = cheerio.load(html);
  const paragraphs: string[] = [];
  $('.fvca_bottom .cc p').each((_, p) => {
    const text = cleanText($(p).text());
    if (text) paragraphs.push(text);
  });
  return paragraphs.join('\n\n');
}

function splitIntroAndDetail(fullText: string) {
  const trimmed = fullText.trim();
  if (!trimmed) return { description: '', detailDescription: '' };
  const firstSentenceMatch = trimmed.match(/^(.+?\.)(?:\s|$)/);
  const description = firstSentenceMatch?.[1]?.trim() ?? trimmed;
  const detailDescription = `<p>${escapeHtml(trimmed).replace(/\n\n/g, '</p><p>')}</p>`;
  return { description, detailDescription };
}

function buildScaleFromStats(stats: SummitStat[]): string {
  return stats.map((s) => `${s.value} ${s.label}`).join(' · ');
}

function parseVideoUrl(html: string): string {
  const $ = cheerio.load(html);
  const videoPath = $('.vieoan').first().attr('datasrc') ?? '';
  return absUrl(videoPath);
}

function monthIndex(name: string): number | null {
  const months: Record<string, number> = {
    january: 0,
    february: 1,
    march: 2,
    april: 3,
    may: 4,
    june: 5,
    july: 6,
    august: 7,
    september: 8,
    october: 9,
    november: 10,
    december: 11,
  };
  return months[name.toLowerCase()] ?? null;
}

function parseDatesFromText(
  text: string,
  fallback: { startDate: string; endDate: string; duration: string },
) {
  const rangeMatch = text.match(
    /from\s+([A-Za-z]+)\s+(\d{1,2})\s+to\s+(?:([A-Za-z]+)\s+)?(\d{1,2}),\s*(\d{4})/i,
  );
  if (!rangeMatch) return fallback;

  const [, startMonthName, startDayRaw, endMonthName, endDayRaw, yearRaw] = rangeMatch;
  const startMonth = monthIndex(startMonthName);
  const endMonth = monthIndex(endMonthName || startMonthName);
  const startDay = Number(startDayRaw);
  const endDay = Number(endDayRaw);
  const year = Number(yearRaw);
  if (startMonth === null || endMonth === null || !startDay || !endDay || !year) return fallback;

  const start = new Date(Date.UTC(year, startMonth, startDay, 1, 0, 0));
  const end = new Date(Date.UTC(year, endMonth, endDay, 14, 0, 0));
  const dayCount =
    Math.floor(
      (Date.UTC(year, endMonth, endDay) - Date.UTC(year, startMonth, startDay)) / (24 * 60 * 60 * 1000),
    ) + 1;

  return {
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    duration: `${dayCount} Days`,
  };
}

function parseLocationFromText(text: string) {
  const location = /Shanghai/i.test(text) ? 'Shanghai, China' : '';
  return { location, address: location };
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

async function uploadToR2(
  key: string,
  url: string,
  report: MissingReport,
  field: string,
): Promise<{ key: string; byteSize: number; contentType: string } | null> {
  try {
    const { buffer, contentType } = await downloadBuffer(url);
    const ext = key.split('.').pop() ?? 'jpg';
    const mime = contentType.includes('mp4')
      ? 'video/mp4'
      : contentType.includes('png')
        ? 'image/png'
        : contentType.includes('webp')
          ? 'image/webp'
          : ext === 'png'
            ? 'image/png'
            : ext === 'mp4'
              ? 'video/mp4'
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
  upload: { key: string; byteSize: number; contentType: string },
) {
  await db.insert(mediaAssets).values({
    type,
    storageKey: upload.key,
    filename: upload.key.split('/').pop() ?? '',
    contentType: upload.contentType,
    byteSize: upload.byteSize,
  });
}

async function fetchInfoPage(year: number): Promise<string> {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();
  const url = `${BASE}/cfvc/${year}-cfvc`;
  console.log(`抓取: ${url}`);
  await page.goto(url, { waitUntil: 'networkidle', timeout: 120000 });
  await page.waitForTimeout(2000);
  const html = await page.content();
  await browser.close();
  return html;
}

async function importYear(config: CfvcPastConfig, outDir: string) {
  const report: MissingReport = {
    emptyFields: [],
    skippedOnSource: ['agenda', 'speakers', 'sponsors', 'transportation'],
    r2UploadFailures: [],
  };

  const html = await fetchInfoPage(config.year);
  await writeFile(path.join(outDir, `info${config.year}.html`), html, 'utf8');

  const stats = parseStats(html);
  const fullDescription = parseFullDescription(html);
  const { description, detailDescription } = splitIntroAndDetail(fullDescription);
  const videoSourceUrl = parseVideoUrl(html);
  const dates = parseDatesFromText(fullDescription, {
    startDate: config.fallbackStartDate,
    endDate: config.fallbackEndDate,
    duration: config.fallbackDuration,
  });
  const { location, address } = parseLocationFromText(fullDescription);
  const scale = buildScaleFromStats(stats);

  const agenda: AgendaGroup[] = [];
  const speakers: SpeakerItem[] = [];
  const sponsors: SponsorItem[] = [];

  const parsed = {
    slug: config.slug,
    status: 'completed' as const,
    title: config.title,
    sortOrder: config.sortOrder,
    ...dates,
    location,
    address,
    description,
    detailDescription,
    scale,
    transportation: '',
    stats,
    agenda,
    speakers,
    sponsors,
    coverSourceUrl: config.coverUrl,
    backgroundSourceUrl: SHARED_BACKGROUND,
    videoSourceUrl,
  };

  if (!fullDescription) report.emptyFields.push('description');
  if (!detailDescription) report.emptyFields.push('detailDescription');
  if (!stats.length) report.emptyFields.push('stats');
  if (!videoSourceUrl) report.emptyFields.push('videoUrl');
  if (!location) report.emptyFields.push('location');

  await writeFile(
    path.join(outDir, `${config.slug}-parsed.json`),
    JSON.stringify(parsed, null, 2),
    'utf8',
  );
  console.log(`\n解析完成: ${config.slug}`);

  if (!APPLY) {
    console.log('[dry-run] 未写入数据库');
    console.log(JSON.stringify(report, null, 2));
    await writeFile(
      path.join(outDir, `${config.slug}-missing-fields.json`),
      JSON.stringify(report, null, 2),
      'utf8',
    );
    return;
  }

  const coverUpload = await uploadToR2(
    `summits/${config.slug}/cover.png`,
    config.coverUrl,
    report,
    'cover',
  );
  const backgroundUpload = await uploadToR2(
    `summits/${config.slug}/background.jpg`,
    SHARED_BACKGROUND,
    report,
    'background',
  );
  const videoUpload = videoSourceUrl
    ? await uploadToR2(`summits/${config.slug}/hero.mp4`, videoSourceUrl, report, 'videoUrl')
    : null;

  const coverKey = coverUpload?.key ?? '';
  const backgroundKey = backgroundUpload?.key ?? '';
  const videoKey = videoUpload?.key ?? '';

  if (coverUpload) await registerMediaAssetHistory(MEDIA_ASSET_TYPE_COVER, coverUpload);
  if (backgroundUpload) await registerMediaAssetHistory(MEDIA_ASSET_TYPE_BACKGROUND, backgroundUpload);

  const now = new Date();
  const [existing] = await db
    .select({ id: summits.id })
    .from(summits)
    .where(eq(summits.slug, config.slug))
    .limit(1);

  if (existing && !FORCE) {
    console.log(` summit ${config.slug} 已存在，使用 --force 覆盖`);
    return;
  }

  const summitValues = {
    status: parsed.status,
    startDate: new Date(dates.startDate),
    endDate: new Date(dates.endDate),
    coverImage: coverKey,
    coverMode: coverKey ? ('upload' as const) : ('' as const),
    coverValue: coverKey,
    videoUrl: videoKey,
    backgroundMode: backgroundKey ? ('upload' as const) : ('' as const),
    backgroundValue: backgroundKey,
    backgroundImage: backgroundKey,
    showCoverOnBackground: false,
    venueImage: '',
    agenda,
    sortOrder: config.sortOrder,
    updatedAt: now,
  };

  let summitId = existing?.id;
  if (existing) {
    await db.update(summits).set(summitValues).where(eq(summits.id, existing.id));
  } else {
    const [inserted] = await db
      .insert(summits)
      .values({ slug: config.slug, ...summitValues })
      .returning({ id: summits.id });
    summitId = inserted.id;
  }

  if (!summitId) throw new Error(`upsert summit failed: ${config.slug}`);

  const translationValues = {
    title: config.title,
    description,
    detailDescription,
    scale,
    duration: dates.duration,
    location,
    address,
    transportation: '',
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

  await writeFile(
    path.join(outDir, `${config.slug}-missing-fields.json`),
    JSON.stringify(report, null, 2),
    'utf8',
  );

  console.log(`已导入 ${config.slug}（locale=en, status=completed）`);
  console.log(`  统计: ${stats.length} 项, 视频: ${videoKey ? '有' : '无'}`);
  console.log('缺失/跳过字段:');
  console.log(JSON.stringify(report, null, 2));
}

async function main() {
  const outDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'scrape-output');
  await mkdir(outDir, { recursive: true });

  const targets = YEAR_ARG ? CONFIGS.filter((c) => String(c.year) === YEAR_ARG) : CONFIGS;

  if (!targets.length) {
    console.error(`未知年份: ${YEAR_ARG}. 可选: 2024, 2021`);
    process.exit(1);
  }

  for (const config of targets) {
    await importYear(config, outDir);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
