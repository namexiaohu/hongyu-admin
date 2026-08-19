import { NextRequest, NextResponse } from 'next/server';

import { frontCorsHeaders } from '@/lib/front-cors';
import { resolveFrontRequestLocale } from '@/lib/front-request-locale';
import { getStorefrontRandomInsights } from '@/server/storefront/insights';

export async function GET(request: NextRequest) {
  const locale = await resolveFrontRequestLocale(request);
  const { searchParams } = request.nextUrl;
  const limit = Number.parseInt(searchParams.get('limit') ?? '6', 10);
  const excludeIds = searchParams.getAll('excludeId').filter(Boolean);

  const payload = await getStorefrontRandomInsights({
    locale,
    limit: Number.isFinite(limit) ? limit : 6,
    excludeIds,
  });

  return NextResponse.json(payload, { headers: frontCorsHeaders() });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: frontCorsHeaders() });
}
