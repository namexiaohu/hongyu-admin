import { NextRequest, NextResponse } from 'next/server';

import { frontCorsHeaders } from '@/lib/front-cors';
import { resolveFrontRequestLocale } from '@/lib/front-request-locale';
import { getStorefrontSummitDetail } from '@/server/storefront/summits';

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const locale = await resolveFrontRequestLocale(request);
  const payload = await getStorefrontSummitDetail({ slug, locale });
  if (!payload) return NextResponse.json({ code: 'NOT_FOUND' }, { status: 404, headers: frontCorsHeaders() });
  return NextResponse.json(payload, { headers: frontCorsHeaders() });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: frontCorsHeaders() });
}
