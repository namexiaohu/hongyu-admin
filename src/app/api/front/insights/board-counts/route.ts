import { NextRequest, NextResponse } from 'next/server';

import { frontCorsHeaders } from '@/lib/front-cors';
import { resolveFrontRequestLocale } from '@/lib/front-request-locale';
import { getStorefrontInsightsBoardCounts } from '@/server/storefront/insights';

export async function GET(request: NextRequest) {
  const locale = await resolveFrontRequestLocale(request);
  const payload = await getStorefrontInsightsBoardCounts(locale);
  return NextResponse.json(payload, { headers: frontCorsHeaders() });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: frontCorsHeaders() });
}
