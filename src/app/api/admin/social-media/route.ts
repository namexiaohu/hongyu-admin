import { NextRequest, NextResponse } from 'next/server';

import { adminSocialMediaPutSchema } from '@/lib/social-media';
import { getAdminSocialMedia, updateAdminSocialMedia } from '@/server/admin/social-media';

export async function GET() {
  const profile = await getAdminSocialMedia();
  return NextResponse.json(profile);
}

export async function PUT(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ code: 'INVALID_BODY', message: '请求体无效或为空' }, { status: 400 });
  }

  const parsed = adminSocialMediaPutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({
      code: 'VALIDATION_ERROR',
      message: '社交媒体校验失败',
      details: parsed.error.flatten(),
    }, { status: 400 });
  }

  try {
    const updated = await updateAdminSocialMedia(parsed.data);
    return NextResponse.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : '保存失败';
    return NextResponse.json({ code: 'SAVE_FAILED', message }, { status: 500 });
  }
}
