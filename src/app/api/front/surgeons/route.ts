import { NextRequest, NextResponse } from 'next/server';

import { frontCorsHeaders } from '@/lib/front-cors';
import { resolveFrontRequestLocale } from '@/lib/front-request-locale';
import { getStorefrontSurgeonsList } from '@/server/storefront/surgeons';

export async function GET(request: NextRequest) {
  const locale = await resolveFrontRequestLocale(request);
  const payload = await getStorefrontSurgeonsList({ locale });
  return NextResponse.json(payload, { headers: frontCorsHeaders() });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: frontCorsHeaders() });
}
