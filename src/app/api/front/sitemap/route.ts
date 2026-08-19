import { NextRequest, NextResponse } from 'next/server';

import { frontCorsHeaders } from '@/lib/front-cors';
import { resolveFrontRequestLocale } from '@/lib/front-request-locale';
import { getStorefrontInsightsBoardCounts, getStorefrontInsightsList } from '@/server/storefront/insights';
import { getCategories, getProductList } from '@/server/storefront';

export async function GET(request: NextRequest) {
  const locale = await resolveFrontRequestLocale(request);
  const [categories, products, insightsList] = await Promise.all([
    getCategories(),
    getProductList({ page: 1, pageSize: 1000 }),
    getStorefrontInsightsList({ locale, page: 1, pageSize: 1000 }),
  ]);

  return NextResponse.json(
    {
      categories,
      products: products.items,
      blogPosts: insightsList.items.map((item) => ({
        slug: item.slug,
        title: item.title,
        publishedAt: item.publishedAt,
      })),
      supportArticles: [],
    },
    { headers: frontCorsHeaders() },
  );
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: frontCorsHeaders() });
}
