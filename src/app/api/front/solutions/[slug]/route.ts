import { NextRequest, NextResponse } from 'next/server';

import { frontCorsHeaders } from '@/lib/front-cors';
import { resolveFrontRequestLocale } from '@/lib/front-request-locale';
import { getStorefrontSolutionBySlug } from '@/server/storefront/solutions';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const locale = await resolveFrontRequestLocale(request);
  const detail = await getStorefrontSolutionBySlug(slug, locale);

  if (!detail) {
    return NextResponse.json({ code: 'NOT_FOUND', message: 'Solution not found' }, { status: 404, headers: frontCorsHeaders() });
  }

  return NextResponse.json(detail, { headers: frontCorsHeaders() });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: frontCorsHeaders() });
}
