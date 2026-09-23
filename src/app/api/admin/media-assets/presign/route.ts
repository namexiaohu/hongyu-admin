import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/auth/admin-auth';
import { IMAGE_UPLOAD_MIME_TYPES, MAX_IMAGE_UPLOAD_BYTES } from '@/lib/media-upload';
import {
  getMediaAssetFolderForType,
  isMediaAssetType,
} from '@/server/admin/media-assets';
import { buildObjectKey, presignPutObject } from '@/server/oss';

type PresignBody = {
  type?: string;
  filename?: string;
  contentType?: string;
  size?: number;
};

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await request.json().catch(() => null)) as PresignBody | null;
    if (!body) {
      return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 });
    }

    const type = String(body.type ?? '').trim();
    const filename = String(body.filename ?? '').trim();
    const contentType = String(body.contentType ?? '').trim();
    const size = Number(body.size);

    if (!type || !isMediaAssetType(type)) {
      return NextResponse.json({ message: 'Invalid type' }, { status: 400 });
    }
    if (!filename || !contentType || !Number.isFinite(size) || size <= 0) {
      return NextResponse.json(
        { message: 'filename, contentType, and size are required' },
        { status: 400 },
      );
    }
    if (!(IMAGE_UPLOAD_MIME_TYPES as readonly string[]).includes(contentType)) {
      return NextResponse.json({ message: `File type not allowed: ${contentType}` }, { status: 400 });
    }
    if (size > MAX_IMAGE_UPLOAD_BYTES) {
      return NextResponse.json({ message: 'File too large (max 10 MB)' }, { status: 400 });
    }

    const folder = getMediaAssetFolderForType(type);
    const key = buildObjectKey(folder, filename);
    const result = await presignPutObject({ key, contentType });

    if (!result.ok) {
      return NextResponse.json({ message: result.error }, { status: 500 });
    }

    return NextResponse.json({
      uploadUrl: result.uploadUrl,
      url: result.url,
      key: result.key,
      filename,
      size,
      contentType,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ message }, { status: 400 });
  }
}
