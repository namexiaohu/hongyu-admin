import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

import { frontCorsHeaders } from '@/lib/front-cors';
import { resolveFrontRequestLocale } from '@/lib/front-request-locale';
import { getCurrentUserId } from '@/server/auth/session';
import { db } from '@/server/db';
import { products, wishlists } from '@/server/db/schema';
import { getWishlistByUser } from '@/server/storefront/account';

const wishlistSchema = z.object({
  productId: z.string().uuid(),
});

export async function GET(request: NextRequest) {
  const userId = await getCurrentUserId(request);
  if (!userId) {
    return NextResponse.json({ code: 'UNAUTHORIZED', message: 'Authentication required' }, { status: 401, headers: frontCorsHeaders() });
  }

  const locale = resolveFrontRequestLocale(request);
  return NextResponse.json({ locale, items: await getWishlistByUser(userId, locale) }, { headers: frontCorsHeaders() });
}

export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId(request);
  if (!userId) {
    return NextResponse.json({ code: 'UNAUTHORIZED', message: 'Authentication required' }, { status: 401, headers: frontCorsHeaders() });
  }

  const body = await request.json();
  const parsed = wishlistSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { code: 'VALIDATION_ERROR', message: 'Invalid wishlist payload', details: parsed.error.flatten() },
      { status: 400, headers: frontCorsHeaders() },
    );
  }

  const [product] = await db.select({ id: products.id }).from(products).where(eq(products.id, parsed.data.productId)).limit(1);
  if (!product) {
    return NextResponse.json({ code: 'NOT_FOUND', message: 'Product not found' }, { status: 404, headers: frontCorsHeaders() });
  }

  await db.insert(wishlists).values({ userId, productId: parsed.data.productId }).onConflictDoNothing();
  const locale = resolveFrontRequestLocale(request);
  return NextResponse.json({ locale, items: await getWishlistByUser(userId, locale) }, { status: 201, headers: frontCorsHeaders() });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: frontCorsHeaders() });
}
