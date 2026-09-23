import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/auth/admin-auth';
import {
  DOCUMENT_UPLOAD_MIME_TYPES,
  IMAGE_UPLOAD_MIME_TYPES,
  MAX_DOCUMENT_UPLOAD_BYTES,
  MAX_IMAGE_UPLOAD_BYTES,
  MAX_VIDEO_UPLOAD_BYTES,
  VIDEO_UPLOAD_MIME_TYPES,
  defaultUploadFolder,
  type MediaUploadKind,
} from '@/lib/media-upload';
import { buildObjectKey, presignPutObject } from '@/server/oss';

const KIND_MIME_MAP: Record<MediaUploadKind, readonly string[]> = {
  image: IMAGE_UPLOAD_MIME_TYPES,
  video: VIDEO_UPLOAD_MIME_TYPES,
  document: DOCUMENT_UPLOAD_MIME_TYPES,
};

const KIND_SIZE_MAP: Record<MediaUploadKind, number> = {
  image: MAX_IMAGE_UPLOAD_BYTES,
  video: MAX_VIDEO_UPLOAD_BYTES,
  document: MAX_DOCUMENT_UPLOAD_BYTES,
};

function parseKind(value: unknown): MediaUploadKind | null {
  if (value === 'image' || value === 'video' || value === 'document') {
    return value;
  }
  return null;
}

function inferKind(contentType: string): MediaUploadKind | null {
  if ((IMAGE_UPLOAD_MIME_TYPES as readonly string[]).includes(contentType)) return 'image';
  if ((VIDEO_UPLOAD_MIME_TYPES as readonly string[]).includes(contentType)) return 'video';
  if ((DOCUMENT_UPLOAD_MIME_TYPES as readonly string[]).includes(contentType)) return 'document';
  return null;
}

type PresignBody = {
  filename?: string;
  contentType?: string;
  size?: number;
  kind?: string;
  folder?: string;
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

    const filename = String(body.filename ?? '').trim();
    const contentType = String(body.contentType ?? '').trim();
    const size = Number(body.size);
    const folderInput = typeof body.folder === 'string' ? body.folder.trim() : '';

    if (!filename || !contentType || !Number.isFinite(size) || size <= 0) {
      return NextResponse.json(
        { message: 'filename, contentType, and size are required' },
        { status: 400 },
      );
    }

    const kind = parseKind(body.kind) ?? inferKind(contentType);
    if (!kind) {
      return NextResponse.json({ message: `File type not allowed: ${contentType}` }, { status: 400 });
    }

    if (!KIND_MIME_MAP[kind].includes(contentType)) {
      return NextResponse.json({ message: `File type not allowed for ${kind}: ${contentType}` }, { status: 400 });
    }

    const maxSize = KIND_SIZE_MAP[kind];
    if (size > maxSize) {
      return NextResponse.json(
        { message: `File too large (max ${Math.round(maxSize / (1024 * 1024))} MB)` },
        { status: 400 },
      );
    }

    const folder = folderInput || defaultUploadFolder(kind);
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
    return NextResponse.json({ message: `Upload failed: ${message}` }, { status: 500 });
  }
}
