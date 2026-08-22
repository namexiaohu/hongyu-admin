import { asc, inArray } from 'drizzle-orm';

import { resolveOssAssetUrl } from '@/lib/oss-asset-url';
import { resolveStorefrontCoverUrl } from '@/lib/cover-presets';
import { defaultProductPayload, type AdminProductPayload } from '@/lib/product-content';
import { db } from '@/server/db';
import { products, productTranslations } from '@/server/db/schema';
import type { StorefrontImage } from '@/server/storefront/types';

import { DEFAULT_PRODUCT_LOCALE } from './resolve-product-translation';

type ProductTranslationRow = typeof productTranslations.$inferSelect;

export async function loadProductCoverFieldsByIds(productIds: string[]) {
  if (!productIds.length) {
    return new Map<string, {
      coverMode: string | null;
      coverValue: string | null;
      coverImage: string | null;
    }>();
  }

  const rows = await db
    .select({
      id: products.id,
      coverMode: products.coverMode,
      coverValue: products.coverValue,
      coverImage: products.coverImage,
    })
    .from(products)
    .where(inArray(products.id, productIds));

  return new Map(rows.map((row) => [row.id, row]));
}

export async function loadProductTranslationsByProductIds(productIds: string[]) {
  if (!productIds.length) {
    return new Map<string, ProductTranslationRow[]>();
  }

  const rows = await db
    .select()
    .from(productTranslations)
    .where(inArray(productTranslations.productId, productIds))
    .orderBy(asc(productTranslations.locale));

  const grouped = new Map<string, ProductTranslationRow[]>();
  for (const row of rows) {
    const bucket = grouped.get(row.productId) ?? [];
    bucket.push(row);
    grouped.set(row.productId, bucket);
  }

  return grouped;
}

export function pickProductTranslation(
  translations: ProductTranslationRow[] | undefined,
  locale: string,
): ProductTranslationRow | null {
  if (!translations?.length) {
    return null;
  }

  return (
    translations.find((item) => item.locale === locale)
    ?? translations.find((item) => item.locale === DEFAULT_PRODUCT_LOCALE)
    ?? [...translations].sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime())[0]
    ?? null
  );
}

function normalizePayload(payload: unknown): AdminProductPayload {
  if (!payload || typeof payload !== 'object') {
    return defaultProductPayload();
  }

  return {
    ...defaultProductPayload(),
    ...(payload as AdminProductPayload),
  };
}

export function coverImageFromPayload(
  productId: string,
  productName: string,
  payload: unknown,
): StorefrontImage | null {
  const data = normalizePayload(payload);
  if (!data.coverUrl?.trim()) {
    return null;
  }

  return {
    id: `${productId}-cover`,
    url: resolveOssAssetUrl(data.coverUrl),
    alt: data.coverAlt?.trim() || productName,
    width: null,
    height: null,
  };
}

export function coverImageFromProductFields(
  productId: string,
  productName: string,
  product: {
    coverMode?: string | null;
    coverValue?: string | null;
    coverImage?: string | null;
  },
  payload: unknown,
): StorefrontImage | null {
  const fromFields = resolveStorefrontCoverUrl({
    mode: product.coverMode,
    value: product.coverValue,
    legacyCoverImageKey: product.coverImage,
    toPublicUrl: resolveOssAssetUrl,
  });
  if (fromFields) {
    const data = normalizePayload(payload);
    return {
      id: `${productId}-cover`,
      url: fromFields,
      alt: data.coverAlt?.trim() || productName,
      width: null,
      height: null,
    };
  }
  return coverImageFromPayload(productId, productName, payload);
}

export function galleryFromPayload(
  productId: string,
  productName: string,
  payload: unknown,
): StorefrontImage[] {
  const data = normalizePayload(payload);
  return data.gallery
    .filter((item) => item.url?.trim())
    .map((item, index) => ({
      id: `${productId}-gallery-${index}`,
      url: resolveOssAssetUrl(item.url),
      alt: item.alt?.trim() || productName,
      width: item.width ?? null,
      height: item.height ?? null,
    }));
}

export function resolveProductCoverImage(
  productId: string,
  productName: string,
  tableImage: StorefrontImage | undefined | null,
  payload: unknown,
  productCover?: {
    coverMode?: string | null;
    coverValue?: string | null;
    coverImage?: string | null;
  } | null,
): StorefrontImage | null {
  const mode = productCover?.coverMode ?? '';
  if ((mode === 'preset' || mode === 'upload') && productCover) {
    const fromFields = coverImageFromProductFields(productId, productName, productCover, payload);
    if (fromFields?.url?.trim()) return fromFields;
  }

  const normalizedTableImage = tableImage?.url?.trim() ? tableImage : null;
  if (normalizedTableImage) return normalizedTableImage;

  if (productCover) {
    return coverImageFromProductFields(productId, productName, productCover, payload);
  }
  return coverImageFromPayload(productId, productName, payload);
}

/** Ensure storefront gallery leads with the resolved cover image. */
export function mergeGalleryWithCover(
  gallery: StorefrontImage[],
  coverImage: StorefrontImage | null,
): StorefrontImage[] {
  if (!coverImage?.url?.trim()) {
    return gallery;
  }

  const coverUrl = coverImage.url.trim();
  const rest = gallery.filter((image) => image.url?.trim() !== coverUrl);
  return [coverImage, ...rest];
}
