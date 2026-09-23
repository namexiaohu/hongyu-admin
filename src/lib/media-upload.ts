export const IMAGE_UPLOAD_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
] as const;

export const VIDEO_UPLOAD_MIME_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-msvideo',
] as const;

export const DOCUMENT_UPLOAD_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
] as const;

export const MAX_IMAGE_UPLOAD_BYTES = 10 * 1024 * 1024;
export const MAX_VIDEO_UPLOAD_BYTES = 100 * 1024 * 1024;
export const MAX_DOCUMENT_UPLOAD_BYTES = 10 * 1024 * 1024;

export type MediaUploadKind = 'image' | 'video' | 'document';

export type MediaUploadResult = {
  url: string;
  key: string;
  filename: string;
  size: number;
  contentType: string;
};

type PresignResponse = MediaUploadResult & {
  uploadUrl: string;
  message?: string;
};

export function resolveMediaUploadKind(contentType: string): MediaUploadKind | null {
  if ((IMAGE_UPLOAD_MIME_TYPES as readonly string[]).includes(contentType)) return 'image';
  if ((VIDEO_UPLOAD_MIME_TYPES as readonly string[]).includes(contentType)) return 'video';
  if ((DOCUMENT_UPLOAD_MIME_TYPES as readonly string[]).includes(contentType)) return 'document';
  return null;
}

export function defaultUploadFolder(kind: MediaUploadKind) {
  switch (kind) {
    case 'image':
      return 'editorial/images';
    case 'video':
      return 'editorial/videos';
    default:
      return 'uploads/documents';
  }
}

export { getPublicOssDomain, isOssCdnUrl } from '@/lib/oss-asset-url';

async function putFileToPresignedUrl(uploadUrl: string, file: File) {
  const putResponse = await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': file.type || 'application/octet-stream',
    },
  });

  if (!putResponse.ok) {
    throw new Error(`直传存储失败 (${putResponse.status})`);
  }
}

export async function uploadMediaFile(
  file: File,
  options?: { folder?: string; kind?: MediaUploadKind },
): Promise<MediaUploadResult> {
  const kind = options?.kind ?? resolveMediaUploadKind(file.type);
  if (!kind) {
    throw new Error(`不支持的文件类型: ${file.type || 'unknown'}`);
  }

  const response = await fetch('/api/admin/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type,
      size: file.size,
      kind,
      folder: options?.folder,
    }),
  });

  const payload = await response.json().catch(() => ({})) as PresignResponse;
  if (!response.ok) {
    throw new Error(payload.message ?? '上传失败');
  }
  if (!payload.uploadUrl || !payload.key || !payload.url) {
    throw new Error('预签名响应无效');
  }

  await putFileToPresignedUrl(payload.uploadUrl, file);

  return {
    url: payload.url,
    key: payload.key,
    filename: payload.filename || file.name,
    size: payload.size || file.size,
    contentType: payload.contentType || file.type,
  };
}
