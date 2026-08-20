import { NextRequest, NextResponse } from 'next/server';

import { adminCompanyProfilePutSchema } from '@/lib/company-profile';
import { getAdminCompanyProfile, updateAdminCompanyProfile } from '@/server/admin/company-profile';

export async function GET() {
  const profile = await getAdminCompanyProfile();
  return NextResponse.json(profile);
}

export async function PUT(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ code: 'INVALID_BODY', message: '请求体无效或为空' }, { status: 400 });
  }

  const parsed = adminCompanyProfilePutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({
      code: 'VALIDATION_ERROR',
      message: '企业信息校验失败',
      details: parsed.error.flatten(),
    }, { status: 400 });
  }

  try {
    const updated = await updateAdminCompanyProfile(parsed.data);
    return NextResponse.json(updated);
  } catch (error) {
    console.error('[company-profile] update failed', error);
    return NextResponse.json({ code: 'UPDATE_FAILED', message: '保存失败，请稍后重试' }, { status: 500 });
  }
}
