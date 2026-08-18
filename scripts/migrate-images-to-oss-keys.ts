import '@/lib/env';

import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { eq } from 'drizzle-orm';

import { createBrandNarrativeCarouselSlide, type BrandNarrativeBlockDraft } from '@/lib/brand-narrative-blocks';
import { getPublicOssDomain, isOssCdnUrl, toOssStorageKey } from '@/lib/oss-asset-url';
import type { AdminProductPayload } from '@/lib/product-content';
import { db } from '@/server/db';
import {
  type BrandNarrativeLegacyPayload,
  brandNarrativeSeedRecords,
} from '@/server/db/brand-narrative-seed-data';
import {
  brandNarrativeContents,
  brandNarratives,
  brands,
  categories,
  productImages,
  productTranslations,
} from '@/server/db/schema';
import { uploadToOss } from '@/server/oss';

const WEB_PUBLIC_DIR = path.resolve(process.cwd(), '..', 'hongyu-web', 'public');
const SITE_ORIGIN = (process.env.SITE_URL ?? 'http://localhost:5000').replace(/\/$/, '');

type PersistAction = 'kept' | 'stripped' | 'uploaded' | 'failed';

const stats = {
  uploaded: 0,
  stripped: 0,
  kept: 0,
  failed: 0,
  rowsUpdated: 0,
};

function mimeFromExtension(ext: string) {
  switch (ext.toLowerCase()) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.gif':
      return 'image/gif';
    case '.webp':
      return 'image/webp';
    case '.svg':
      return 'image/svg+xml';
    default:
      return 'image/jpeg';
  }
}

function isHttpUrl(value: string) {
  return /^(https?:)?\/\//i.test(value);
}

function isLocalPublicPath(value: string) {
  return /^\/(images|hero|media)\//i.test(value);
}

function looksLikeStoredKey(value: string) {
  if (!value || isHttpUrl(value) || value.startsWith('data:')) return false;
  if (isLocalPublicPath(value)) return false;
  return true;
}

async function downloadImage(url: string) {
  const response = await fetch(url, {
    redirect: 'follow',
    headers: {
      'user-agent': 'Mozilla/5.0 (compatible; hongyu-oss-migrate/1.0)',
      accept: 'image/*,*/*;q=0.8',
    },
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length < 200) {
    throw new Error(`图片过小 (${buffer.length} bytes)`);
  }
  const ext = path.extname(new URL(url).pathname) || '.jpg';
  return {
    buffer,
    filename: `${randomUUID()}${ext}`,
    contentType: response.headers.get('content-type') ?? mimeFromExtension(ext),
  };
}

async function loadImageBuffer(source: string) {
  if (source.startsWith('/')) {
    const filePath = path.join(WEB_PUBLIC_DIR, source.replace(/^\//, ''));
    try {
      const buffer = await readFile(filePath);
      const ext = path.extname(filePath) || '.jpg';
      return {
        buffer,
        filename: path.basename(filePath),
        contentType: mimeFromExtension(ext),
      };
    } catch {
      return downloadImage(`${SITE_ORIGIN}${source}`);
    }
  }

  return downloadImage(source);
}

async function persistImageValue(
  source: string,
  folder: string,
  cache: Map<string, string>,
): Promise<{ key: string; action: PersistAction }> {
  const trimmed = source.trim();
  if (!trimmed) return { key: '', action: 'kept' };

  const cached = cache.get(trimmed);
  if (cached) return { key: cached, action: 'kept' };

  if (looksLikeStoredKey(trimmed)) {
    const key = trimmed.replace(/^\//, '');
    cache.set(trimmed, key);
    stats.kept += 1;
    return { key, action: 'kept' };
  }

  if (isHttpUrl(trimmed) && (isOssCdnUrl(trimmed) || toOssStorageKey(trimmed) !== trimmed)) {
    const key = toOssStorageKey(trimmed);
    if (key && !isHttpUrl(key)) {
      cache.set(trimmed, key);
      stats.stripped += 1;
      return { key, action: 'stripped' };
    }
  }

  try {
    const { buffer, filename, contentType } = await loadImageBuffer(trimmed);
    const result = await uploadToOss({ buffer, filename, contentType, folder });
    if (!result.ok) {
      throw new Error(result.error);
    }
    cache.set(trimmed, result.key);
    stats.uploaded += 1;
    console.log(`  已上传 ${trimmed} -> ${result.key}`);
    return { key: result.key, action: 'uploaded' };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    stats.failed += 1;
    console.warn(`  保留原值: ${trimmed} | ${message}`);
    return { key: trimmed, action: 'failed' };
  }
}

function seedPayloadForSlug(slug: string): BrandNarrativeLegacyPayload | null {
  const record = brandNarrativeSeedRecords.find((item) => item.slug === slug);
  return record?.translations[0]?.payload ?? null;
}

type SeedBlockImages = {
  carousel?: string;
  items: Array<string | undefined>;
};

function collectSeedBlockImages(payload: BrandNarrativeLegacyPayload) {
  const blocks: Record<string, SeedBlockImages> = {};
  for (const section of payload.sections) {
    const id = typeof section.id === 'string' ? section.id : '';
    if (!id) continue;

    if (section.type === 'split-content') {
      blocks[id] = {
        carousel: typeof section.image === 'string' ? section.image : undefined,
        items: [],
      };
      continue;
    }

    if (section.type === 'header-grid') {
      const cards = Array.isArray(section.cards) ? section.cards as Array<Record<string, unknown>> : [];
      blocks[id] = {
        items: cards.map((card) => (typeof card.image === 'string' ? card.image : undefined)),
      };
      continue;
    }

    if (section.type === 'timeline') {
      const items = Array.isArray(section.items) ? section.items as Array<Record<string, unknown>> : [];
      blocks[id] = {
        items: items.map((item) => (typeof item.image === 'string' ? item.image : undefined)),
      };
      continue;
    }

    if (section.type === 'course') {
      const courses = Array.isArray(section.courses) ? section.courses as Array<Record<string, unknown>> : [];
      blocks[id] = {
        items: courses.map((item) => (typeof item.image === 'string' ? item.image : undefined)),
      };
    }
  }
  return blocks;
}

async function migrateNarratives(cache: Map<string, string>) {
  const rows = await db.select().from(brandNarratives);
  const contentRows = await db.select().from(brandNarrativeContents);
  const contentsByNarrativeId = new Map(contentRows.map((row) => [row.narrativeId, row]));

  for (const row of rows) {
    const payload = seedPayloadForSlug(row.slug);
    if (!payload) {
      console.warn(`无 seed 图片映射: ${row.slug}`);
      continue;
    }

    const cover = await persistImageValue(payload.hero.image, 'brand-narratives/covers', cache);
    if (cover.key && cover.key !== row.coverImage) {
      await db
        .update(brandNarratives)
        .set({ coverImage: cover.key, updatedAt: new Date() })
        .where(eq(brandNarratives.id, row.id));
      stats.rowsUpdated += 1;
      console.log(`叙事封面已更新: ${row.slug} -> ${cover.key}`);
    }

    const content = contentsByNarrativeId.get(row.id);
    if (!content) continue;

    const seedBlocks = collectSeedBlockImages(payload);
    const blocks = (content.blocks ?? []) as BrandNarrativeBlockDraft[];
    let changed = false;
    const nextBlocks: BrandNarrativeBlockDraft[] = [];

    for (const block of blocks) {
      const seed = seedBlocks[block.id];
      let carouselImages = block.carouselImages;
      const items = [...(block.items ?? [])];

      if (seed?.carousel) {
        const result = await persistImageValue(seed.carousel, 'brand-narratives/gallery', cache);
        if (result.key) {
          const current = carouselImages?.[0];
          if (!current) {
            carouselImages = [createBrandNarrativeCarouselSlide(result.key)];
            changed = true;
          } else if (current.url !== result.key) {
            carouselImages = [{ ...current, url: result.key }, ...(carouselImages?.slice(1) ?? [])];
            changed = true;
          }
        }
      }

      if (seed?.items.length) {
        for (let index = 0; index < items.length; index += 1) {
          const source = seed.items[index];
          if (!source) continue;
          const result = await persistImageValue(source, 'brand-narratives/covers', cache);
          if (result.key && result.key !== items[index].coverImage) {
            items[index] = { ...items[index], coverImage: result.key };
            changed = true;
          }
        }
      }

      nextBlocks.push({
        ...block,
        carouselImages,
        items,
      });
    }

    if (changed) {
      await db
        .update(brandNarrativeContents)
        .set({ blocks: nextBlocks, updatedAt: new Date() })
        .where(eq(brandNarrativeContents.id, content.id));
      stats.rowsUpdated += 1;
      console.log(`叙事区块已更新: ${row.slug}`);
    }
  }
}

function normalizePayload(payload: unknown): AdminProductPayload {
  const data = (payload ?? {}) as Partial<AdminProductPayload>;
  return {
    coverUrl: data.coverUrl ?? null,
    coverAlt: data.coverAlt ?? null,
    gallery: data.gallery ?? [],
    tags: data.tags ?? [],
    attachments: data.attachments ?? [],
    certifications: data.certifications ?? [],
  };
}

async function migrateProductPayloads(cache: Map<string, string>) {
  const rows = await db.select({
    id: productTranslations.id,
    payload: productTranslations.payload,
  }).from(productTranslations);

  for (const row of rows) {
    const original = row.payload;
    const payload = normalizePayload(original);
    let changed = false;

    let coverUrl = payload.coverUrl;
    if (coverUrl?.trim()) {
      const result = await persistImageValue(coverUrl, 'products/covers', cache);
      if (result.key !== coverUrl) changed = true;
      coverUrl = result.key;
    }

    const gallery = [];
    for (const item of payload.gallery) {
      if (!item.url?.trim()) continue;
      const result = await persistImageValue(item.url, 'products/gallery', cache);
      if (result.key !== item.url) changed = true;
      gallery.push({ ...item, url: result.key });
    }

    if (!changed) continue;

    await db
      .update(productTranslations)
      .set({
        payload: { ...original, ...payload, coverUrl, gallery },
        updatedAt: new Date(),
      })
      .where(eq(productTranslations.id, row.id));
    stats.rowsUpdated += 1;
  }
}

async function migrateProductImages(cache: Map<string, string>) {
  const rows = await db.select({
    id: productImages.id,
    url: productImages.url,
  }).from(productImages);

  for (const row of rows) {
    const result = await persistImageValue(row.url, 'products/gallery', cache);
    if (result.key === row.url) continue;
    await db
      .update(productImages)
      .set({ url: result.key, updatedAt: new Date() })
      .where(eq(productImages.id, row.id));
    stats.rowsUpdated += 1;
  }
}

async function migrateCategories(cache: Map<string, string>) {
  const rows = await db.select({
    id: categories.id,
    imageUrl: categories.imageUrl,
  }).from(categories);

  for (const row of rows) {
    if (!row.imageUrl?.trim()) continue;
    const result = await persistImageValue(row.imageUrl, 'categories/logos', cache);
    if (result.key === row.imageUrl) continue;
    await db
      .update(categories)
      .set({ imageUrl: result.key, updatedAt: new Date() })
      .where(eq(categories.id, row.id));
    stats.rowsUpdated += 1;
  }
}

async function migrateBrands(cache: Map<string, string>) {
  const rows = await db.select({
    id: brands.id,
    logoUrl: brands.logoUrl,
  }).from(brands);

  for (const row of rows) {
    if (!row.logoUrl?.trim()) continue;
    const result = await persistImageValue(row.logoUrl, 'brands/logos', cache);
    if (result.key === row.logoUrl) continue;
    await db
      .update(brands)
      .set({ logoUrl: result.key, updatedAt: new Date() })
      .where(eq(brands.id, row.id));
    stats.rowsUpdated += 1;
  }
}

async function main() {
  const domain = getPublicOssDomain();
  if (!domain) {
    throw new Error('R2_DOMAIN 未配置');
  }

  console.log(`R2 域名: ${domain}`);
  console.log(`本地静态目录: ${WEB_PUBLIC_DIR}`);

  const cache = new Map<string, string>();
  await migrateNarratives(cache);
  await migrateProductPayloads(cache);
  await migrateProductImages(cache);
  await migrateCategories(cache);
  await migrateBrands(cache);

  console.log('\n图片 R2 key 迁移完成:', {
    ...stats,
    uniqueCached: cache.size,
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
