import { NextRequest, NextResponse } from 'next/server';

import { frontCorsHeaders } from '@/lib/front-cors';
import { resolveFrontRequestLocale } from '@/lib/front-request-locale';
import { getStorefrontSolutionsList } from '@/server/storefront/solutions';

export async function GET(request: NextRequest) {
  const locale = await resolveFrontRequestLocale(request);
  const { searchParams } = request.nextUrl;
  const category = searchParams.get('category') ?? undefined;
  const page = Number.parseInt(searchParams.get('page') ?? '1', 10);
  const pageSize = Number.parseInt(searchParams.get('pageSize') ?? '4', 10);

  const payload = await getStorefrontSolutionsList({
    category,
    locale,
    page: Number.isFinite(page) ? page : 1,
    pageSize: Number.isFinite(pageSize) ? pageSize : 4,
  });

  return NextResponse.json(payload, { headers: frontCorsHeaders() });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: frontCorsHeaders() });
}
