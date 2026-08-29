import { NextRequest, NextResponse } from 'next/server';

import { frontCorsHeaders } from '@/lib/front-cors';
import { getCurrentUserId } from '@/server/auth/session';
import { startExamAttempt } from '@/server/storefront/academy-exams';

type RouteContext = { params: Promise<{ courseSlug: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const userId = await getCurrentUserId(request);
  if (!userId) {
    return NextResponse.json(
      { code: 'UNAUTHORIZED', message: 'Authentication required' },
      { status: 401, headers: frontCorsHeaders() },
    );
  }

  const { courseSlug } = await context.params;
  const body = await request.json().catch(() => ({})) as { locale?: string };
  const locale = body.locale?.trim() || request.nextUrl.searchParams.get('locale')?.trim() || undefined;
  const result = await startExamAttempt(userId, courseSlug, locale);

  if (!result.ok) {
    const status = result.code === 'NOT_FOUND' ? 404 : 403;
    return NextResponse.json(
      { code: result.code, message: result.code },
      { status, headers: frontCorsHeaders() },
    );
  }

  return NextResponse.json(result, { status: 201, headers: frontCorsHeaders() });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: frontCorsHeaders() });
}
