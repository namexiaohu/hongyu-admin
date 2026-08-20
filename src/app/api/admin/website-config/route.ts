import { NextRequest, NextResponse } from 'next/server';

import { adminWebsiteConfigPutSchema } from '@/lib/website-config';
import { getAdminWebsiteConfig, updateAdminWebsiteConfig } from '@/server/admin/website-config';

export async function GET() {
  const config = await getAdminWebsiteConfig();
  return NextResponse.json(config);
}

export async function PUT(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ code: 'INVALID_BODY', message: '请求体无效或为空' }, { status: 400 });
  }

  const parsed = adminWebsiteConfigPutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({
      code: 'VALIDATION_ERROR',
      message: '网站配置校验失败',
      details: parsed.error.flatten(),
    }, { status: 400 });
  }

  try {
    const updated = await updateAdminWebsiteConfig(parsed.data);
    return NextResponse.json(updated);
  } catch (error) {
    console.error('[website-config] update failed', error);
    return NextResponse.json({ code: 'UPDATE_FAILED', message: '保存失败，请稍后重试' }, { status: 500 });
  }
}
