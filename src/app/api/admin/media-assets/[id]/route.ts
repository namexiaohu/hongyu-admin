import { NextResponse } from 'next/server';

import { auth } from '@/auth/admin-auth';
import { deleteAdminMediaAsset, getAdminMediaAssetById } from '@/server/admin/media-assets';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  if (!id?.trim()) {
    return NextResponse.json({ message: 'Missing id' }, { status: 400 });
  }

  const existing = await getAdminMediaAssetById(id);
  if (!existing) {
    return NextResponse.json({ message: 'Not found' }, { status: 404 });
  }

  const ok = await deleteAdminMediaAsset(id);
  if (!ok) {
    return NextResponse.json({ message: 'Delete failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id });
}
