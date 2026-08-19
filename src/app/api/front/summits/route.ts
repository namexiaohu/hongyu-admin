import { NextRequest, NextResponse } from 'next/server';

import { frontCorsHeaders } from '@/lib/front-cors';
import { resolveFrontRequestLocale } from '@/lib/front-request-locale';
import { getStorefrontSummitsList } from '@/server/storefront/summits';

export async function GET(request: NextRequest) {
  const locale = await resolveFrontRequestLocale(request);
  const payload = await getStorefrontSummitsList({ locale });
  return NextResponse.json(payload, { headers: frontCorsHeaders() });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: frontCorsHeaders() });
}
