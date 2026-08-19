import { NextRequest, NextResponse } from 'next/server';

import { frontCorsHeaders } from '@/lib/front-cors';
import { resolveFrontRequestLocale } from '@/lib/front-request-locale';
import { getStorefrontInsightsList } from '@/server/storefront/insights';

export async function GET(request: NextRequest) {
  const locale = await resolveFrontRequestLocale(request);
  const { searchParams } = request.nextUrl;
  const boardKey = searchParams.get('board') ?? searchParams.get('category') ?? undefined;
  const page = Number.parseInt(searchParams.get('page') ?? '1', 10);
  const pageSize = Number.parseInt(searchParams.get('pageSize') ?? '6', 10);

  const payload = await getStorefrontInsightsList({
    boardKey,
    locale,
    page: Number.isFinite(page) ? page : 1,
    pageSize: Number.isFinite(pageSize) ? pageSize : 6,
  });

  return NextResponse.json(payload, { headers: frontCorsHeaders() });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: frontCorsHeaders() });
}
