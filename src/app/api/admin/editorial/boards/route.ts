import { NextRequest, NextResponse } from 'next/server';

import {
  upsertEditorialCoverageBoard,
  upsertEditorialCoverageBoardSchema,
} from '@/server/admin/editorial-coverage-boards';
import { getAdminEditorialDashboard } from '@/server/admin/editorial';

function mapError(error: unknown) {
  if (!(error instanceof Error)) return null;
  switch (error.message) {
    case 'INVALID_KEY':
      return { status: 400, code: 'INVALID_KEY', message: 'Key 只能包含小写英文字母和连字符' };
    case 'SAVE_FAILED':
      return { status: 500, code: 'SAVE_FAILED', message: '保存看板失败' };
    default:
      return null;
  }
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const parsed = upsertEditorialCoverageBoardSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { code: 'VALIDATION_ERROR', message: '请填写 Key 和看板名称', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const item = await upsertEditorialCoverageBoard(parsed.data);
    const dashboard = await getAdminEditorialDashboard();
    return NextResponse.json({ item, dashboard });
  } catch (error) {
    const mapped = mapError(error);
    if (mapped) {
      return NextResponse.json({ code: mapped.code, message: mapped.message }, { status: mapped.status });
    }
    throw error;
  }
}
