import '@/lib/env';

import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { and, eq } from 'drizzle-orm';

import {
  INSIGHT_BOARD_I18N_EN,
  INSIGHT_SEED_ARTICLES,
} from '@/lib/insight-blog-seed-data';
import { db } from '@/server/db';
import {
  editorialContentBoards,
  editorialContentTranslations,
  editorialContents,
  editorialCoverageBoards,
  editorialCoverageBoardTranslations,
} from '@/server/db/schema';
import { putStorageObject } from '@/server/oss';

const DEFAULT_LOCALE = 'en';
const CONTENT_MODULE = 'editorial' as const;
const forceRefresh = process.argv.includes('--force');

const LOCAL_IMAGE_DIR = path.resolve(process.cwd(), '../hongyu-web/public/images');

function mimeFromExtension(ext: string) {
  switch (ext) {
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

const coverKeyCache = new Map<string, string>();

async function resolveCoverKey(slug: string, coverFile: string) {
  const cached = coverKeyCache.get(`${slug}:${coverFile}`);
  if (cached && !forceRefresh) return cached;

  const ext = path.extname(coverFile).toLowerCase() || '.jpg';
  const key = `editorial/insights/${slug}${ext}`;
  const filePath = path.join(LOCAL_IMAGE_DIR, coverFile);
  const buffer = await readFile(filePath);
  if (buffer.length < 500) {
    throw new Error(`Image too small (${buffer.length} bytes): ${filePath}`);
  }

  console.log(`上传封面: ${coverFile} → ${key}`);
  const result = await putStorageObject(key, buffer, mimeFromExtension(ext));
  if (!result.ok) {
    throw new Error(result.error);
  }

  coverKeyCache.set(`${slug}:${coverFile}`, result.key);
  return result.key;
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
        eq(editorialContentTranslations.locale, DEFAULT_LOCALE),
        eq(editorialContentTranslations.contentModule, CONTENT_MODULE),
      ),
    )
    .limit(1);
  return row ?? null;
}

async function syncBoard(contentId: string, boardKey: string) {
  await db!
    .delete(editorialContentBoards)
    .where(eq(editorialContentBoards.contentId, contentId));
  await db!.insert(editorialContentBoards).values({ contentId, boardKey });
}

async function upsertArticles() {
  let created = 0;
  let updated = 0;

  for (const article of INSIGHT_SEED_ARTICLES) {
    const coverImage = await resolveCoverKey(article.slug, article.coverFile);
    const publishedAt = new Date(article.publishedAt);
    const now = new Date();
    const payload = {
      body: article.body,
      coverStyle: null,
      tags: [],
      relatedProductSlugs: [],
      authorName: article.authorName,
      authorTitle: article.authorTitle,
      authorBio: null,
      category: null,
    };

    const existing = await findTranslationBySlug(article.slug);

    if (existing) {
      await db!.transaction(async (tx) => {
        await tx
          .update(editorialContents)
          .set({
            contentModule: CONTENT_MODULE,
            boardKey: article.boardKey,
            coverImage,
            status: 'published',
            publishedAt,
            updatedAt: now,
          })
          .where(eq(editorialContents.id, existing.contentId));

        await tx
          .update(editorialContentTranslations)
          .set({
            contentModule: CONTENT_MODULE,
            title: article.title,
            slug: article.slug,
            summary: article.summary,
            seoTitle: article.seoTitle,
            seoDescription: article.seoDescription,
            payload,
            updatedAt: now,
          })
          .where(eq(editorialContentTranslations.id, existing.translationId));
      });

      await syncBoard(existing.contentId, article.boardKey);
      updated += 1;
      console.log(`更新: [${article.boardKey}] ${article.title} (${article.slug})`);
      continue;
    }

    await db!.transaction(async (tx) => {
      const [createdContent] = await tx
        .insert(editorialContents)
        .values({
          contentType: 'content',
          contentModule: CONTENT_MODULE,
          boardKey: article.boardKey,
          coverImage,
          status: 'published',
          publishedAt,
          createdAt: publishedAt,
          updatedAt: now,
        })
        .returning({ id: editorialContents.id });

      if (!createdContent) {
        throw new Error(`Failed to create content: ${article.slug}`);
      }

      await tx.insert(editorialContentTranslations).values({
        contentId: createdContent.id,
        contentType: 'content',
        contentModule: CONTENT_MODULE,
        locale: DEFAULT_LOCALE,
        title: article.title,
        slug: article.slug,
        summary: article.summary,
        seoTitle: article.seoTitle,
        seoDescription: article.seoDescription,
        payload,
      });

      await tx.insert(editorialContentBoards).values({
        contentId: createdContent.id,
        boardKey: article.boardKey,
      });
    });

    created += 1;
    console.log(`新建: [${article.boardKey}] ${article.title} (${article.slug})`);
  }

  return { created, updated };
}

async function seedBoardI18n() {
  const timestamp = new Date();

  for (const board of INSIGHT_BOARD_I18N_EN) {
    const [existing] = await db!
      .select()
      .from(editorialCoverageBoards)
      .where(eq(editorialCoverageBoards.boardKey, board.key))
      .limit(1);

    if (!existing) {
      throw new Error(`看板 ${board.key} 不存在，请先在后台创建 case / paper / experience`);
    }

    const [enRow] = await db!
      .select()
      .from(editorialCoverageBoardTranslations)
      .where(
        and(
          eq(editorialCoverageBoardTranslations.boardId, existing.id),
          eq(editorialCoverageBoardTranslations.locale, DEFAULT_LOCALE),
        ),
      )
      .limit(1);

    if (enRow) {
      await db!
        .update(editorialCoverageBoardTranslations)
        .set({
          name: board.name,
          description: board.description,
          updatedAt: timestamp,
        })
        .where(eq(editorialCoverageBoardTranslations.id, enRow.id));
    } else {
      await db!.insert(editorialCoverageBoardTranslations).values({
        boardId: existing.id,
        locale: DEFAULT_LOCALE,
        name: board.name,
        description: board.description,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    }

    console.log(`看板 i18n [en]: ${board.key} → ${board.name}`);
  }
}

async function main() {
  if (!db) {
    throw new Error('DATABASE_URL is required before running db:seed:insight-blogs');
  }

  console.log('Seeding insight board i18n (locale=en)...');
  await seedBoardI18n();

  console.log(`\nSeeding ${INSIGHT_SEED_ARTICLES.length} insight articles (locale=en)...`);
  const stats = await upsertArticles();
  console.log('\n完成:', stats);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
