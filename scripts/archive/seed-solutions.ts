import '@/lib/env';

import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { and, eq, notInArray } from 'drizzle-orm';

import {
  createSolutionBlockItemId,
  createSolutionBlockId,
  createSolutionCarouselSlide,
  isSummaryIcon,
  type SolutionBlockDraft,
  type SolutionSummaryIcon,
} from '@/lib/solution-blocks';
import { SOLUTION_SEED_RECORDS, type SolutionSeedRecord } from '@/lib/solution-seed-data';
import { db } from '@/server/db';
import {
  categoryTranslations,
  productCoverageBoards,
  solutionBoardLinks,
  solutionContents,
  solutionTranslations,
  solutions,
} from '@/server/db/schema';
import { putStorageObject } from '@/server/oss';

const DEFAULT_LOCALE = 'en';
const forceRefresh = process.argv.includes('--force');
const LOCAL_IMAGE_DIR = path.resolve(process.cwd(), '../hongyu-web/public/images');

function mimeFromExtension(ext: string) {
  switch (ext.toLowerCase()) {
    case '.webp':
      return 'image/webp';
    case '.png':
      return 'image/png';
    case '.gif':
      return 'image/gif';
    default:
      return 'image/jpeg';
  }
}

const imageKeyCache = new Map<string, string>();

async function downloadBuffer(url: string) {
  const response = await fetch(url, {
    headers: {
      'user-agent': 'Mozilla/5.0 (compatible; hongyu-solutions-seed/1.0)',
    },
  });
  if (!response.ok) {
    throw new Error(`Download failed ${response.status}: ${url}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

async function loadImageBuffer(localFile: string | undefined, remoteUrl: string) {
  if (localFile) {
    try {
      const filePath = path.join(LOCAL_IMAGE_DIR, localFile);
      const buffer = await readFile(filePath);
      if (buffer.length >= 500) return { buffer, ext: path.extname(localFile) || '.jpg' };
    } catch {
      // fall through to remote
    }
  }
  const buffer = await downloadBuffer(remoteUrl);
  return { buffer, ext: '.jpg' };
}

async function uploadImage(slug: string, role: string, source: { localFile?: string; remoteUrl: string }) {
  const cacheKey = `${slug}:${role}:${source.localFile ?? source.remoteUrl}`;
  const cached = imageKeyCache.get(cacheKey);
  if (cached && !forceRefresh) return cached;

  const { buffer, ext } = await loadImageBuffer(source.localFile, source.remoteUrl);
  const key = `solutions/${slug}/${role}${ext}`;
  console.log(`上传图片: ${slug}/${role} → ${key}`);
  const result = await putStorageObject(key, buffer, mimeFromExtension(ext));
  if (!result.ok) throw new Error(result.error);
  imageKeyCache.set(cacheKey, result.key);
  return result.key;
}

async function findCategoryId(categorySlug: string) {
  const [row] = await db
    .select({ categoryId: categoryTranslations.categoryId })
    .from(categoryTranslations)
    .where(eq(categoryTranslations.slug, categorySlug))
    .limit(1);
  return row?.categoryId ?? null;
}

function localeCopy(values: { smallTitle?: string; largeTitle?: string; description?: string }) {
  return {
    [DEFAULT_LOCALE]: {
      smallTitle: values.smallTitle ?? '',
      largeTitle: values.largeTitle ?? '',
      description: values.description ?? '',
      buttonLabel: '',
      badge: '',
      totalHours: '',
      teachingFormat: '',
      trainingCycle: '',
    },
  };
}

function buildBlocks(record: SolutionSeedRecord, imageKeys: Record<string, string>): SolutionBlockDraft[] {
  return record.blocks.map((block) => {
    const draft: SolutionBlockDraft = {
      id: createSolutionBlockId(),
      type: block.type,
      locales: localeCopy({
        smallTitle: block.smallTitle,
        largeTitle: block.largeTitle,
        description: block.description,
      }),
      items: [],
    };

    if (block.type === 'split') {
      draft.layout = block.layout === 'image-right' ? 'image-right' : 'image-left';
      const imageKey = block.imageRole ? imageKeys[block.imageRole] : '';
      draft.carouselImages = imageKey ? [createSolutionCarouselSlide(imageKey)] : [];
      draft.items = (block.items ?? []).map((item) => ({
        id: createSolutionBlockItemId(),
        locales: localeCopy({
          smallTitle: item.smallTitle,
          largeTitle: item.largeTitle,
          description: item.description,
        }),
      }));
    }

    if (block.type === 'summary') {
      draft.layout = 'multi-3';
      draft.items = (block.items ?? []).map((item) => ({
        id: createSolutionBlockItemId(),
        icon: (isSummaryIcon(item.icon) ? item.icon : 'layers') as SolutionSummaryIcon,
        coverImage: imageKeys[item.imageRole] ?? '',
        locales: localeCopy({
          smallTitle: item.smallTitle,
          largeTitle: item.largeTitle,
          description: item.description,
        }),
      }));
    }

    return draft;
  });
}

async function upsertSolution(record: SolutionSeedRecord, categoryId: string | null, imageKeys: Record<string, string>) {
  const blocks = buildBlocks(record, imageKeys);
  const coverImage = imageKeys[record.coverRole] ?? '';
  const now = new Date();

  const [existing] = await db
    .select({ id: solutions.id })
    .from(solutions)
    .where(eq(solutions.slug, record.slug))
    .limit(1);

  let solutionId = existing?.id;

  if (existing) {
    await db
      .update(solutions)
      .set({
        categoryId,
        sortOrder: record.sortOrder,
        status: 'published',
        publishedAt: now,
        coverImage,
        updatedAt: now,
      })
      .where(eq(solutions.id, existing.id));
  } else {
    const [inserted] = await db
      .insert(solutions)
      .values({
        slug: record.slug,
        categoryId,
        sortOrder: record.sortOrder,
        status: 'published',
        publishedAt: now,
        coverImage,
        materials: [],
      })
      .returning({ id: solutions.id });
    solutionId = inserted.id;
  }

  if (!solutionId) throw new Error(`Failed to upsert ${record.slug}`);

  const [translation] = await db
    .select({ id: solutionTranslations.id })
    .from(solutionTranslations)
    .where(and(eq(solutionTranslations.solutionId, solutionId), eq(solutionTranslations.locale, DEFAULT_LOCALE)))
    .limit(1);

  const translationValues = {
    title: record.title,
    largeTitle: record.largeTitle,
    description: record.description,
    badgeText: record.badgeText,
    seoTitle: record.seoTitle,
    seoDescription: record.seoDescription,
    stats: record.stats,
    productParams: record.productParams,
    tags: record.tags,
    updatedAt: now,
  };

  if (translation) {
    await db.update(solutionTranslations).set(translationValues).where(eq(solutionTranslations.id, translation.id));
  } else {
    await db.insert(solutionTranslations).values({
      solutionId,
      locale: DEFAULT_LOCALE,
      ...translationValues,
    });
  }

  const [content] = await db
    .select({ id: solutionContents.id })
    .from(solutionContents)
    .where(eq(solutionContents.solutionId, solutionId))
    .limit(1);

  if (content) {
    await db.update(solutionContents).set({ blocks, updatedAt: now }).where(eq(solutionContents.id, content.id));
  } else {
    await db.insert(solutionContents).values({ solutionId, blocks });
  }

  await syncSolutionBoardLink(solutionId, record.slug);
}

async function syncSolutionBoardLink(solutionId: string, boardKey: string) {
  const [board] = await db
    .select({ id: productCoverageBoards.id })
    .from(productCoverageBoards)
    .where(eq(productCoverageBoards.boardKey, boardKey))
    .limit(1);

  await db.delete(solutionBoardLinks).where(eq(solutionBoardLinks.solutionId, solutionId));
  if (!board) {
    console.warn(`未找到看板 boardKey="${boardKey}"，跳过 solution_board_links`);
    return;
  }
  await db.insert(solutionBoardLinks).values({ solutionId, boardId: board.id }).onConflictDoNothing();
}

async function pruneExtraSolutions() {
  const keep = SOLUTION_SEED_RECORDS.map((record) => record.slug);
  const stale = await db
    .select({ slug: solutions.slug })
    .from(solutions)
    .where(notInArray(solutions.slug, keep));
  if (!stale.length) return;
  await db.delete(solutions).where(notInArray(solutions.slug, keep));
  console.log(`已删除多余解决方案: ${stale.map((row) => row.slug).join(', ')}`);
}

async function main() {
  await pruneExtraSolutions();

  for (const record of SOLUTION_SEED_RECORDS) {
    const categoryId = await findCategoryId(record.categorySlug);
    if (!categoryId) {
      console.warn(`未找到分类 slug="${record.categorySlug}"，解决方案 categoryId 将留空。`);
    }

    const imageKeys: Record<string, string> = {};
    for (const [role, source] of Object.entries(record.imageSources)) {
      imageKeys[role] = await uploadImage(record.slug, role, source);
    }

    await upsertSolution(record, categoryId, imageKeys);
    console.log(`已写入解决方案: ${record.slug} (${record.title})`);
  }

  console.log('\n解决方案种子数据完成。');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
