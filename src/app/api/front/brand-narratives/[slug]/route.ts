import { NextRequest, NextResponse } from 'next/server';

import { frontCorsHeaders } from '@/lib/front-cors';
import { resolveFrontRequestLocale } from '@/lib/front-request-locale';
import { getStorefrontBrandNarrativeBySlug } from '@/server/storefront/brand-narratives';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const locale = await resolveFrontRequestLocale(request);
  const detail = await getStorefrontBrandNarrativeBySlug(slug, locale);

  if (!detail) {
    return NextResponse.json({ code: 'NOT_FOUND', message: 'Brand narrative not found' }, { status: 404, headers: frontCorsHeaders() });
  }

  return NextResponse.json(detail, { headers: frontCorsHeaders() });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: frontCorsHeaders() });
}
