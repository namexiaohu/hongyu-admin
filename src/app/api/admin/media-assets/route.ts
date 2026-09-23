import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/auth/admin-auth';
import { IMAGE_UPLOAD_MIME_TYPES, MAX_IMAGE_UPLOAD_BYTES } from '@/lib/media-upload';
import {
  createAdminMediaAssetFromKey,
  isMediaAssetType,
  listAdminMediaAssets,
} from '@/server/admin/media-assets';

type RegisterBody = {
  type?: string;
  storageKey?: string;
  filename?: string;
  contentType?: string;
  byteSize?: number;
};

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const type = request.nextUrl.searchParams.get('type')?.trim() ?? '';
  if (!type || !isMediaAssetType(type)) {
    return NextResponse.json({ message: 'Invalid or missing type' }, { status: 400 });
  }

  const items = await listAdminMediaAssets(type);
  return NextResponse.json({ items, total: items.length });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await request.json().catch(() => null)) as RegisterBody | null;
    if (!body) {
      return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 });
    }

    const type = String(body.type ?? '').trim();
    const storageKey = String(body.storageKey ?? '').trim();
    const filename = String(body.filename ?? '').trim();
    const contentType = String(body.contentType ?? '').trim();
    const byteSize = Number(body.byteSize);

    if (!type || !isMediaAssetType(type)) {
      return NextResponse.json({ message: 'Invalid type' }, { status: 400 });
    }
    if (!storageKey) {
      return NextResponse.json({ message: 'storageKey is required' }, { status: 400 });
    }
    if (contentType && !(IMAGE_UPLOAD_MIME_TYPES as readonly string[]).includes(contentType)) {
      return NextResponse.json({ message: `File type not allowed: ${contentType}` }, { status: 400 });
    }
    if (Number.isFinite(byteSize) && byteSize > MAX_IMAGE_UPLOAD_BYTES) {
      return NextResponse.json({ message: 'File too large (max 10 MB)' }, { status: 400 });
    }

    const asset = await createAdminMediaAssetFromKey({
      type,
      storageKey,
      filename: filename || undefined,
      contentType: contentType || undefined,
      byteSize: Number.isFinite(byteSize) ? byteSize : undefined,
    });

    return NextResponse.json(asset, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload failed';
    if (message === 'INVALID_STORAGE_KEY') {
      return NextResponse.json({ message: 'Invalid storage key for type' }, { status: 400 });
    }
    if (message === 'INVALID_TYPE') {
      return NextResponse.json({ message: 'Invalid type' }, { status: 400 });
    }
    return NextResponse.json({ message }, { status: 400 });
  }
}
