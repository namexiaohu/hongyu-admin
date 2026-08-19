import { NextRequest, NextResponse } from 'next/server';

import {
  deleteProductCoverageBoard,
  getAdminProductBoardsDashboard,
  getProductCoverageBoardDetail,
  patchProductCoverageBoardSchema,
  setProductCoverageBoardEnabled,
} from '@/server/admin/product-boards';

function mapError(error: unknown) {
  if (!(error instanceof Error)) return null;
  switch (error.message) {
    case 'SYSTEM_BOARD':
      return { status: 409, code: 'SYSTEM_BOARD', message: '系统默认看板不可删除' };
    case 'BOARD_HAS_PRODUCTS':
      return { status: 409, code: 'BOARD_HAS_PRODUCTS', message: '该看板下已有产品，无法删除' };
    default:
      return null;
  }
}

export async function GET(_: Request, { params }: { params: Promise<{ boardKey: string }> }) {
  const { boardKey } = await params;
  const item = await getProductCoverageBoardDetail(boardKey);
  if (!item) {
    return NextResponse.json({ code: 'NOT_FOUND', message: '看板不存在' }, { status: 404 });
  }
  return NextResponse.json({ item });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ boardKey: string }> }) {
  const { boardKey } = await params;
  const body = await request.json();
  const parsed = patchProductCoverageBoardSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { code: 'VALIDATION_ERROR', message: 'Invalid payload', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const item = await setProductCoverageBoardEnabled(boardKey, parsed.data.enabled);
  if (!item) {
    return NextResponse.json({ code: 'NOT_FOUND', message: '看板不存在' }, { status: 404 });
  }

  const dashboard = await getAdminProductBoardsDashboard();
  return NextResponse.json({ item, dashboard });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ boardKey: string }> }) {
  const { boardKey } = await params;

  try {
    const deleted = await deleteProductCoverageBoard(boardKey);
    if (!deleted) {
      return NextResponse.json({ code: 'NOT_FOUND', message: '看板不存在' }, { status: 404 });
    }
    const dashboard = await getAdminProductBoardsDashboard();
    return NextResponse.json({ dashboard });
  } catch (error) {
    const mapped = mapError(error);
    if (mapped) {
      return NextResponse.json({ code: mapped.code, message: mapped.message }, { status: mapped.status });
    }
    throw error;
  }
}
