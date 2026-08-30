import { NextRequest, NextResponse } from 'next/server';

import { frontCorsHeaders } from '@/lib/front-cors';
import { resolveFrontRequestLocale } from '@/lib/front-request-locale';
import { getStorefrontAcademyCertificateList } from '@/server/storefront/academy-certificates';

export async function GET(request: NextRequest) {
  const locale = await resolveFrontRequestLocale(request);
  const { searchParams } = request.nextUrl;
  const page = Number.parseInt(searchParams.get('page') ?? '1', 10);
  const pageSize = Number.parseInt(searchParams.get('pageSize') ?? '24', 10);
  const q = searchParams.get('q')?.trim() ?? '';
  const payload = await getStorefrontAcademyCertificateList({
    locale,
    page: Number.isFinite(page) ? page : 1,
    pageSize: Number.isFinite(pageSize) ? pageSize : 24,
    q,
  });
  return NextResponse.json(payload, { headers: frontCorsHeaders(request.headers.get('origin')) });
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: frontCorsHeaders(request.headers.get('origin')) });
}
