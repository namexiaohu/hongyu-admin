import { NextRequest, NextResponse } from 'next/server';

import { adminHomepageConfigPutSchema } from '@/lib/homepage-config';
import { getAdminHomepageConfig, updateAdminHomepageConfig } from '@/server/admin/homepage-config';

export async function GET() {
  const config = await getAdminHomepageConfig();
  return NextResponse.json(config);
}

export async function PUT(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ code: 'INVALID_BODY', message: '请求体无效或为空' }, { status: 400 });
  }

  const parsed = adminHomepageConfigPutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({
      code: 'VALIDATION_ERROR',
      message: '首页配置校验失败',
      details: parsed.error.flatten(),
    }, { status: 400 });
  }

  try {
    const updated = await updateAdminHomepageConfig(parsed.data);
    return NextResponse.json(updated);
  } catch (error) {
    console.error('[homepage-config] update failed', error);
    return NextResponse.json({ code: 'UPDATE_FAILED', message: '保存失败，请稍后重试' }, { status: 500 });
  }
}
