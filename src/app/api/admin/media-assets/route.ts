import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/auth/admin-auth';
import { IMAGE_UPLOAD_MIME_TYPES, MAX_IMAGE_UPLOAD_BYTES } from '@/lib/media-upload';
import {
  createAdminMediaAssetFromUpload,
  isMediaAssetType,
  listAdminMediaAssets,
} from '@/server/admin/media-assets';

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
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const type = String(formData.get('type') ?? '').trim();

    if (!file) {
      return NextResponse.json({ message: 'No file provided' }, { status: 400 });
    }
    if (!isMediaAssetType(type)) {
      return NextResponse.json({ message: 'Invalid type' }, { status: 400 });
    }
    if (!(IMAGE_UPLOAD_MIME_TYPES as readonly string[]).includes(file.type)) {
      return NextResponse.json({ message: `File type not allowed: ${file.type}` }, { status: 400 });
    }
    if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
      return NextResponse.json({ message: 'File too large (max 10 MB)' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const asset = await createAdminMediaAssetFromUpload({
      type,
      buffer,
      filename: file.name,
      contentType: file.type,
      byteSize: file.size,
    });

    return NextResponse.json(asset, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload failed';
    return NextResponse.json({ message }, { status: 400 });
  }
}
