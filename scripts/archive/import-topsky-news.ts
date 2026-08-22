import '@/lib/env';

import { createHash } from 'node:crypto';
import path from 'node:path';

import { and, eq, inArray } from 'drizzle-orm';

import { rewriteHtmlOssAssets } from '@/lib/oss-asset-url';
import { db } from '@/server/db';
import {
  editorialContentBoards,
  editorialContentTranslations,
  editorialContents,
  editorialCoverageBoards,
} from '@/server/db/schema';
import { putStorageObject } from '@/server/oss';

const SITE_ID = '1751938991030050816';
const HOST = 'view.topsky.com';
const API_BASE = 'https://napi-p.topsky.com/pages/getData';
const TARGET_BOARDS = ['paper', 'experience'] as const;
type TargetBoardKey = (typeof TARGET_BOARDS)[number];
const LOCALE = 'en';
const CONTENT_MODULE = 'editorial' as const;
const APPLY = process.argv.includes('--apply');
const FORCE_MEDIA = process.argv.includes('--force');

type ListItem = {
  name: string;
  path: string;
  publishDate: string;
  introduction?: string;
  imageUrls?: string[];
};

type SourceConfig = {
  items?: ListItem[];
  pager?: { totalPages?: number; totalRecords?: number; currentPage?: number; pageSize?: number };
  listType?: string;
};

type GetDataResponse = {
  attributes?: {
    config?: Record<string, { dataSource?: { settingValues?: { sourceConfig?: SourceConfig } } }>;
  };
  pageInfo?: {
    name?: string;
    path?: string;
    publishDate?: string;
    introduction?: string;
    pcDetail1?: string;
    thumbnails?: string[];
  };
  errorMessage?: string;
};

const AUTHOR_POOL = [
  { name: 'Dr. Elena Vasquez', title: 'Veterinary Cardiologist' },
  { name: 'Dr. Marcus Chen', title: 'Interventional Cardiology Specialist' },
  { name: 'Dr. Priya Nair', title: 'Small Animal Soft Tissue Surgeon' },
  { name: 'Dr. James Whitfield', title: 'Cardiology Fellow' },
  { name: 'Dr. Sofia Alvarez', title: 'Veterinary Surgical Resident' },
  { name: 'Dr. Hiro Tanaka', title: 'Minimally Invasive Surgery Lead' },
  { name: 'Dr. Hannah Brooks', title: 'Clinical Cardiology Consultant' },
  { name: 'Dr. Omar Haddad', title: 'Veterinary Interventionist' },
  { name: 'Dr. Claire Dubois', title: 'Cardiothoracic Veterinary Surgeon' },
  { name: 'Dr. Ryan Okonkwo', title: 'Senior Veterinary Cardiologist' },
  { name: 'Dr. Mei Lin Zhao', title: 'Structural Heart Procedure Specialist' },
  { name: 'Dr. Thomas Keller', title: 'Veterinary Imaging & Cardiology' },
] as const;

const SECTION_TITLES = [
  'Overview',
  'Highlights',
  'Details',
  'Outcomes',
  'Discussion',
  'Closing Notes',
] as const;

const PAPER_KEYWORDS = [
  'study',
  'retrospective',
  'frontiers',
  'journal',
  'publication',
  'published',
  'efficacy',
  'safety and efficacy',
  'research',
  'association between',
  'evaluating',
  'clinical outcomes',
  'nt-probnp',
  'ctni',
] as const;

const EXPERIENCE_KEYWORDS = [
  'training',
  'completed',
  'team',
  'doctors',
  'forum',
  'hospital',
  'visit',
  'ceremony',
  'introduction to',
  'welcome',
  'workshop',
  'concludes',
] as const;

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
    case '.mp4':
      return 'video/mp4';
    default:
      return 'image/jpeg';
  }
}

function extensionFromUrl(url: string, contentType?: string | null) {
  try {
    const pathname = decodeURIComponent(new URL(url).pathname);
    const ext = path.extname(pathname).toLowerCase();
    if (ext && ext.length <= 5) return ext;
  } catch {
    // ignore
  }
  if (contentType?.includes('png')) return '.png';
  if (contentType?.includes('webp')) return '.webp';
  if (contentType?.includes('gif')) return '.gif';
  if (contentType?.includes('mp4')) return '.mp4';
  return '.jpg';
}

function slugFromPath(articlePath: string) {
  const cleaned = articlePath.split('?')[0] ?? articlePath;
  const parts = cleaned.split('/').filter(Boolean);
  return parts[parts.length - 1] || cleaned.replace(/[^\w-]+/g, '-');
}

function hashPick<T>(seed: string, items: readonly T[]): T {
  const digest = createHash('sha1').update(seed).digest();
  const index = digest[0]! % items.length;
  return items[index]!;
}

function stripTags(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&mdash;|&ndash;/gi, '—')
    .replace(/&rsquo;|&lsquo;/gi, "'")
    .replace(/&rdquo;|&ldquo;/gi, '"')
    .replace(/&#\d+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildSummary(bodyHtml: string, fallback?: string) {
  const text = stripTags(bodyHtml);
  if (!text) {
    const intro = (fallback ?? '').trim();
    if (!intro) return 'News update from HongYu Medical.';
    return intro.length > 220 ? `${intro.slice(0, 217).trim()}...` : intro;
  }
  const sentences = text.match(/[^.!?]+[.!?]+/g) ?? [text];
  let summary = '';
  for (const sentence of sentences) {
    const next = `${summary} ${sentence.trim()}`.trim();
    if (next.length > 240 && summary) break;
    summary = next;
    if (summary.length >= 120) break;
  }
  if (!summary) summary = text.slice(0, 220);
  return summary.length > 280 ? `${summary.slice(0, 277).trim()}...` : summary;
}

function sanitizeHtml(html: string) {
  return html
    .replace(/\s*color\s*:\s*#[0-9a-fA-F]{3,8}\s*;?/gi, '')
    .replace(/\s*background(?:-color)?\s*:\s*[^;"']+;?/gi, '')
    .replace(/\sstyle=(["'])\s*\1/gi, '')
    .replace(/<(font)([^>]*)>/gi, '<span$2>')
    .replace(/<\/font>/gi, '</span>')
    .replace(/width=["']100%["']/gi, '')
    .replace(/height=["']100%["']/gi, '');
}

function injectHeadingSections(html: string) {
  if (/<h[2-4][\s>]/i.test(html)) {
    return html;
  }

  const blocks = html
    .split(/(?=<p\b)/i)
    .map((part) => part.trim())
    .filter(Boolean);

  if (blocks.length <= 1) {
    return `<h2>Overview</h2>\n${html}`;
  }

  const chunkSize = Math.max(
    1,
    Math.ceil(blocks.length / Math.min(SECTION_TITLES.length, Math.max(2, Math.ceil(blocks.length / 3)))),
  );
  const sections: string[] = [];
  let titleIndex = 0;

  for (let i = 0; i < blocks.length; i += chunkSize) {
    const title = SECTION_TITLES[titleIndex] ?? `Section ${titleIndex + 1}`;
    titleIndex += 1;
    sections.push(`<h2>${title}</h2>\n${blocks.slice(i, i + chunkSize).join('\n')}`);
  }

  return sections.join('\n');
}

function scoreKeywords(text: string, keywords: readonly string[]) {
  const lower = text.toLowerCase();
  let score = 0;
  for (const keyword of keywords) {
    if (lower.includes(keyword)) score += 1;
  }
  return score;
}

function classifyBoard(title: string, bodyHtml: string): { boardKey: TargetBoardKey; paperScore: number; experienceScore: number } {
  const corpus = `${title}\n${stripTags(bodyHtml)}`;
  const paperScore = scoreKeywords(corpus, PAPER_KEYWORDS);
  const experienceScore = scoreKeywords(corpus, EXPERIENCE_KEYWORDS);
  const boardKey: TargetBoardKey = paperScore > experienceScore ? 'paper' : 'experience';
  return { boardKey, paperScore, experienceScore };
}

async function fetchGetData(articlePath: string, currentPage?: number) {
  const qs = new URLSearchParams({ siteId: SITE_ID, host: HOST });
  if (currentPage && currentPage > 1) qs.set('currentPage', String(currentPage));

  const response = await fetch(`${API_BASE}?${qs.toString()}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: `https://${HOST}`,
      referer: `https://${HOST}/`,
      'user-agent': 'Mozilla/5.0 (compatible; hongyu-import/1.0)',
    },
    body: JSON.stringify({ siteId: SITE_ID, host: HOST, path: articlePath }),
  });

  if (!response.ok) {
    throw new Error(`getData HTTP ${response.status} for ${articlePath}`);
  }

  const data = (await response.json()) as GetDataResponse;
  if (data.errorMessage) {
    throw new Error(`getData error for ${articlePath}: ${data.errorMessage}`);
  }
  return data;
}

function extractNewsListItems(data: GetDataResponse): { items: ListItem[]; totalPages: number } {
  const config = data.attributes?.config ?? {};
  const candidates: Array<{ key: string; source: SourceConfig }> = [];

  for (const [key, value] of Object.entries(config)) {
    const source = value?.dataSource?.settingValues?.sourceConfig;
    if (!source?.items?.length || !source.pager) continue;
    if (source.listType && source.listType !== 'news') continue;
    candidates.push({ key, source });
  }

  const lirt = candidates.find((entry) => entry.key.startsWith('LIRTList'));
  const best = lirt?.source
    ?? [...candidates].sort(
      (left, right) => (right.source.pager?.totalRecords ?? 0) - (left.source.pager?.totalRecords ?? 0),
    )[0]?.source;

  if (!best?.items?.length) {
    throw new Error('LIRTList/news list config not found on /news page');
  }

  return {
    items: best.items,
    totalPages: best.pager?.totalPages ?? 1,
  };
}

async function fetchAllListItems() {
  const first = await fetchGetData('/news', 1);
  const { items: page1, totalPages } = extractNewsListItems(first);
  const all = [...page1];

  for (let page = 2; page <= totalPages; page += 1) {
    const data = await fetchGetData('/news', page);
    const { items } = extractNewsListItems(data);
    all.push(...items);
  }

  const unique = new Map<string, ListItem>();
  for (const item of all) {
    if (!item.path) continue;
    unique.set(item.path, item);
  }
  return [...unique.values()];
}

async function downloadAndUpload(url: string, folder: string, preferredName: string) {
  const trimmed = url.trim();
  if (!trimmed) return '';

  const cached = mediaCache.get(trimmed);
  if (cached && !FORCE_MEDIA) return cached;

  const response = await fetch(trimmed, {
    headers: {
      'user-agent': 'Mozilla/5.0 (compatible; hongyu-import/1.0)',
      referer: `https://${HOST}/`,
    },
  });
  if (!response.ok) {
    throw new Error(`download failed ${response.status}: ${trimmed}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length < 200) {
    throw new Error(`image too small (${buffer.length} bytes): ${trimmed}`);
  }

  const ext = extensionFromUrl(trimmed, response.headers.get('content-type'));
  const hash = createHash('sha1').update(trimmed).digest('hex').slice(0, 12);
  const safeBase = preferredName.replace(/[^\w.-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'asset';
  const key = `${folder}/${safeBase}-${hash}${ext}`;
  const result = await putStorageObject(key, buffer, mimeFromExtension(ext));
  if (!result.ok) {
    throw new Error(result.error);
  }

  mediaCache.set(trimmed, result.key);
  return result.key;
}

async function rewriteBodyImages(html: string, slug: string) {
  const srcPattern = /(src)=(["'])([^"']+)\2/gi;
  const urls = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = srcPattern.exec(html)) !== null) {
    const value = match[3]?.trim();
    if (value && /^https?:\/\//i.test(value)) {
      urls.add(value);
    }
  }

  let next = html;
  let index = 0;
  for (const url of urls) {
    index += 1;
    try {
      const key = await downloadAndUpload(url, 'editorial/images', `${slug}-img${index}`);
      if (!key) continue;
      const escaped = url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      next = next.replace(new RegExp(escaped, 'g'), key);
      console.log(`  正文图 → ${key}`);
    } catch (error) {
      console.warn(`  跳过正文图 ${url}: ${error instanceof Error ? error.message : error}`);
    }
  }

  return rewriteHtmlOssAssets(next, 'toStorageKey');
}

async function ensureTargetBoardsExist() {
  for (const boardKey of TARGET_BOARDS) {
    const [board] = await db!
      .select({ id: editorialCoverageBoards.id })
      .from(editorialCoverageBoards)
      .where(eq(editorialCoverageBoards.boardKey, boardKey))
      .limit(1);
    if (!board) {
      throw new Error(`看板 ${boardKey} 不存在，请先在后台创建 paper / experience`);
    }
  }
}

async function findTranslationBySlug(slug: string) {
  const [row] = await db!
    .select({
      translationId: editorialContentTranslations.id,
      contentId: editorialContentTranslations.contentId,
    })
    .from(editorialContentTranslations)
    .where(
      and(
        eq(editorialContentTranslations.slug, slug),
        eq(editorialContentTranslations.locale, LOCALE),
        eq(editorialContentTranslations.contentModule, CONTENT_MODULE),
      ),
    )
    .limit(1);
  return row ?? null;
}

async function syncBoard(contentId: string, boardKey: TargetBoardKey) {
  await db!.delete(editorialContentBoards).where(eq(editorialContentBoards.contentId, contentId));
  await db!.insert(editorialContentBoards).values({ contentId, boardKey });
}

async function listExistingBoardContentIds(boardKey: TargetBoardKey) {
  const rows = await db!
    .select({ contentId: editorialContentBoards.contentId })
    .from(editorialContentBoards)
    .where(eq(editorialContentBoards.boardKey, boardKey));
  return rows.map((row) => row.contentId);
}

async function upsertArticle(input: {
  slug: string;
  title: string;
  summary: string;
  body: string;
  coverImage: string;
  publishedAt: Date;
  authorName: string;
  authorTitle: string;
  boardKey: TargetBoardKey;
}) {
  const now = new Date();
  const payload = {
    body: input.body,
    coverStyle: null,
    tags: [] as string[],
    relatedProductSlugs: [] as string[],
    authorName: input.authorName,
    authorTitle: input.authorTitle,
    authorBio: null,
    category: null,
  };

  const existing = await findTranslationBySlug(input.slug);
  if (existing) {
    await db!.transaction(async (tx) => {
      await tx
        .update(editorialContents)
        .set({
          contentModule: CONTENT_MODULE,
          boardKey: input.boardKey,
          coverImage: input.coverImage,
          status: 'published',
          publishedAt: input.publishedAt,
          updatedAt: now,
        })
        .where(eq(editorialContents.id, existing.contentId));

      await tx
        .update(editorialContentTranslations)
        .set({
          contentModule: CONTENT_MODULE,
          title: input.title,
          slug: input.slug,
          summary: input.summary,
          seoTitle: input.title,
          seoDescription: input.summary,
          payload,
          updatedAt: now,
        })
        .where(eq(editorialContentTranslations.id, existing.translationId));
    });
    await syncBoard(existing.contentId, input.boardKey);
    return { contentId: existing.contentId, created: false };
  }

  const contentId = await db!.transaction(async (tx) => {
    const [createdContent] = await tx
      .insert(editorialContents)
      .values({
        contentType: 'content',
        contentModule: CONTENT_MODULE,
        boardKey: input.boardKey,
        coverImage: input.coverImage,
        status: 'published',
        publishedAt: input.publishedAt,
        createdAt: input.publishedAt,
        updatedAt: now,
      })
      .returning({ id: editorialContents.id });

    if (!createdContent) {
      throw new Error(`Failed to create content: ${input.slug}`);
    }

    await tx.insert(editorialContentTranslations).values({
      contentId: createdContent.id,
      contentType: 'content',
      contentModule: CONTENT_MODULE,
      locale: LOCALE,
      title: input.title,
      slug: input.slug,
      summary: input.summary,
      seoTitle: input.title,
      seoDescription: input.summary,
      payload,
    });

    await tx.insert(editorialContentBoards).values({
      contentId: createdContent.id,
      boardKey: input.boardKey,
    });

    return createdContent.id;
  });

  return { contentId, created: true };
}

async function purgeOldBoardArticles(
  boardKey: TargetBoardKey,
  keepContentIds: string[],
  preexistingIds: string[],
) {
  const keepSet = new Set(keepContentIds);
  const toDelete = preexistingIds.filter((id) => !keepSet.has(id));
  if (!toDelete.length) {
    console.log(`无需删除旧 ${boardKey} 文章`);
    return 0;
  }

  const deletable = await db!
    .select({ contentId: editorialContentBoards.contentId })
    .from(editorialContentBoards)
    .where(
      and(
        eq(editorialContentBoards.boardKey, boardKey),
        inArray(editorialContentBoards.contentId, toDelete),
      ),
    );

  const ids = [...new Set(deletable.map((row) => row.contentId))];
  if (!ids.length) {
    console.log(`无需删除旧 ${boardKey} 文章`);
    return 0;
  }

  await db!.delete(editorialContents).where(inArray(editorialContents.id, ids));
  console.log(`已删除旧 ${boardKey} 文章 ${ids.length} 篇`);
  return ids.length;
}

async function processArticle(item: ListItem) {
  const slug = slugFromPath(item.path);
  const detail = await fetchGetData(item.path);
  const title = (detail.pageInfo?.name || item.name || slug).trim();
  const publishDate = detail.pageInfo?.publishDate || item.publishDate;
  const publishedAt = new Date(`${publishDate}T00:00:00.000Z`);
  if (Number.isNaN(publishedAt.getTime())) {
    throw new Error(`invalid publishDate for ${slug}: ${publishDate}`);
  }

  const rawBody = detail.pageInfo?.pcDetail1?.trim() || '';
  const introduction = detail.pageInfo?.introduction || item.introduction || '';
  const coverSource = item.imageUrls?.[0]?.trim() || detail.pageInfo?.thumbnails?.[0]?.trim() || '';

  let body = sanitizeHtml(rawBody || `<p>${introduction || title}</p>`);
  const classification = classifyBoard(title, body);

  console.log(`\n处理: ${title} (${slug})`);
  console.log(
    `  看板判定: ${classification.boardKey} (paper=${classification.paperScore}, experience=${classification.experienceScore})`,
  );

  let coverImage = '';
  if (coverSource) {
    if (APPLY) {
      coverImage = await downloadAndUpload(coverSource, 'editorial/insights', `${slug}-cover`);
      console.log(`  封面 → ${coverImage}`);
    } else {
      console.log(`  [dry-run] 封面 ${coverSource}`);
    }
  } else {
    console.warn('  无封面图');
  }

  if (APPLY) {
    body = await rewriteBodyImages(body, slug);
  }
  body = injectHeadingSections(body);
  body = rewriteHtmlOssAssets(body, 'toStorageKey');

  const summary = buildSummary(body, introduction);
  const author = hashPick(slug, AUTHOR_POOL);

  if (!APPLY) {
    console.log(`  [dry-run] summary=${summary.slice(0, 80)}...`);
    console.log(`  [dry-run] author=${author.name} / ${author.title}`);
    console.log(`  [dry-run] bodyChars=${body.length}`);
    return {
      slug,
      contentId: null as string | null,
      created: false,
      boardKey: classification.boardKey,
    };
  }

  const result = await upsertArticle({
    slug,
    title,
    summary,
    body,
    coverImage,
    publishedAt,
    authorName: author.name,
    authorTitle: author.title,
    boardKey: classification.boardKey,
  });
  console.log(`  ${result.created ? '新建' : '更新'} [${classification.boardKey}] contentId=${result.contentId}`);
  return {
    slug,
    contentId: result.contentId,
    created: result.created,
    boardKey: classification.boardKey,
  };
}

async function main() {
  if (!db) {
    throw new Error('DATABASE_URL is required');
  }

  console.log(APPLY ? '模式: APPLY（写入数据库与 R2）' : '模式: DRY-RUN（仅预览，加 --apply 才写入）');
  await ensureTargetBoardsExist();

  const preexistingByBoard: Record<TargetBoardKey, string[]> = {
    paper: await listExistingBoardContentIds('paper'),
    experience: await listExistingBoardContentIds('experience'),
  };
  const caseCount = (
    await db!
      .select({ contentId: editorialContentBoards.contentId })
      .from(editorialContentBoards)
      .where(eq(editorialContentBoards.boardKey, 'case'))
  ).length;

  console.log(
    `当前文章数: paper=${preexistingByBoard.paper.length}, experience=${preexistingByBoard.experience.length}, case=${caseCount}（case 不会被清理）`,
  );

  console.log('拉取 News 列表 (LIRTList)...');
  const items = await fetchAllListItems();
  console.log(`列表共 ${items.length} 篇`);

  let created = 0;
  let updated = 0;
  const importedByBoard: Record<TargetBoardKey, string[]> = { paper: [], experience: [] };
  const boardTally: Record<TargetBoardKey, number> = { paper: 0, experience: 0 };

  for (const item of items) {
    const result = await processArticle(item);
    boardTally[result.boardKey] += 1;
    if (result.contentId) {
      importedByBoard[result.boardKey].push(result.contentId);
      if (result.created) created += 1;
      else updated += 1;
    }
  }

  if (APPLY) {
    const deletedPaper = await purgeOldBoardArticles(
      'paper',
      importedByBoard.paper,
      preexistingByBoard.paper,
    );
    const deletedExperience = await purgeOldBoardArticles(
      'experience',
      importedByBoard.experience,
      preexistingByBoard.experience,
    );
    console.log('\n完成:', {
      imported: items.length,
      created,
      updated,
      boardTally,
      deleted: { paper: deletedPaper, experience: deletedExperience },
      kept: {
        paper: importedByBoard.paper.length,
        experience: importedByBoard.experience.length,
      },
      caseUntouched: true,
    });
  } else {
    console.log('\nDRY-RUN 完成:', {
      wouldImport: items.length,
      boardTally,
      existing: {
        paper: preexistingByBoard.paper.length,
        experience: preexistingByBoard.experience.length,
        case: caseCount,
      },
      note: '执行 pnpm db:import:topsky-news -- --apply 才会上传 R2、写库并清理旧 paper/experience 文章（不动 case）',
    });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
