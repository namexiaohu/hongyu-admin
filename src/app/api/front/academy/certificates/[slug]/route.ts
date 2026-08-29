import { NextRequest, NextResponse } from 'next/server';

import { frontCorsHeaders } from '@/lib/front-cors';
import { resolveFrontRequestLocale } from '@/lib/front-request-locale';
import { getStorefrontAcademyCertificateBySlug } from '@/server/storefront/academy-certificates';

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const locale = await resolveFrontRequestLocale(request);
  const { slug } = await context.params;
  const detail = await getStorefrontAcademyCertificateBySlug(slug, locale);
  if (!detail) {
    return NextResponse.json({ code: 'NOT_FOUND', message: 'Certificate not found' }, { status: 404, headers: frontCorsHeaders(request.headers.get('origin')) });
  }
  return NextResponse.json(detail, { headers: frontCorsHeaders(request.headers.get('origin')) });
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: frontCorsHeaders(request.headers.get('origin')) });
}
