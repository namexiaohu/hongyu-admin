import { NextRequest, NextResponse } from 'next/server';

import { frontCorsHeaders } from '@/lib/front-cors';
import { resolveFrontRequestLocale } from '@/lib/front-request-locale';
import { getStorefrontSurgeonBySlug } from '@/server/storefront/surgeons';

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const locale = await resolveFrontRequestLocale(request);
  const surgeon = await getStorefrontSurgeonBySlug({ slug, locale });

  if (!surgeon) {
    return NextResponse.json(
      { code: 'NOT_FOUND', message: 'Surgeon not found' },
      { status: 404, headers: frontCorsHeaders() },
    );
  }

  return NextResponse.json({ locale, ...surgeon }, { headers: frontCorsHeaders() });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: frontCorsHeaders() });
}
