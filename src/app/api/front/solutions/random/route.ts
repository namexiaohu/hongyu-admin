import { NextRequest, NextResponse } from 'next/server';

import { frontCorsHeaders } from '@/lib/front-cors';
import { resolveFrontRequestLocale } from '@/lib/front-request-locale';
import { getStorefrontRandomSolutions } from '@/server/storefront/solutions';

export async function GET(request: NextRequest) {
  const locale = await resolveFrontRequestLocale(request);
  const { searchParams } = request.nextUrl;
  const exclude = searchParams.get('exclude') ?? undefined;
  const limit = Number.parseInt(searchParams.get('limit') ?? '4', 10);

  const items = await getStorefrontRandomSolutions({
    excludeSlug: exclude,
    limit: Number.isFinite(limit) ? limit : 4,
    locale,
  });

  return NextResponse.json({ items }, { headers: frontCorsHeaders() });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: frontCorsHeaders() });
}
