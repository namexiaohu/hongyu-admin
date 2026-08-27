'use client';

import { DeleteOutlined, LoadingOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Space, Typography, Upload, message } from 'antd';
import type { UploadProps } from 'antd';
import { useState } from 'react';

import { IMAGE_UPLOAD_MIME_TYPES, MAX_IMAGE_UPLOAD_BYTES, uploadMediaFile } from '@/lib/media-upload';
import { resolveOssAssetUrl } from '@/lib/oss-asset-url';
import { MediaPreviewImage } from '@/components/editorial/media-preview-image';

type CoverImageFieldProps = {
  value?: string | null;
  onChange?: (value: string | null) => void;
  disabled?: boolean;
  folder?: string;
  uploadLabel?: string;
  previewAlt?: string;
  removeLabel?: string;
  /** cover = wide media preview; avatar = compact square thumb */
  variant?: 'cover' | 'avatar';
  /** Pass null to hide the helper line */
  hint?: string | null;
};

export function CoverImageField({
  value,
  onChange,
  disabled = false,
  folder = 'editorial/images',
  uploadLabel,
  previewAlt,
  removeLabel,
  variant = 'cover',
  hint,
}: CoverImageFieldProps) {
  const [uploading, setUploading] = useState(false);
  const isAvatar = variant === 'avatar';
  const resolvedUploadLabel = uploadLabel ?? (isAvatar ? '上传头像' : '上传封面图');
  const resolvedPreviewAlt = previewAlt ?? (isAvatar ? '头像预览' : '封面预览');
  const resolvedRemoveLabel = removeLabel ?? (isAvatar ? '移除头像' : '移除封面');
  const resolvedHint = hint === undefined
    ? (isAvatar ? 'JPG / PNG / WebP 等，最大 10MB' : '支持 JPG / PNG / GIF / WebP / SVG，最大 10MB，上传至对象存储。')
    : hint;

  const uploadProps: UploadProps = {
    accept: IMAGE_UPLOAD_MIME_TYPES.join(','),
    showUploadList: false,
    disabled: disabled || uploading,
    beforeUpload: (file) => {
      if (!IMAGE_UPLOAD_MIME_TYPES.includes(file.type as typeof IMAGE_UPLOAD_MIME_TYPES[number])) {
        void message.error('仅支持 JPG、PNG、GIF、WebP、SVG 图片');
        return Upload.LIST_IGNORE;
      }
      if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
        void message.error('图片大小不能超过 10MB');
        return Upload.LIST_IGNORE;
      }
      return true;
    },
    customRequest: async ({ file, onError, onSuccess }) => {
      try {
        setUploading(true);
        const result = await uploadMediaFile(file as File, { kind: 'image', folder });
        onChange?.(result.key);
        onSuccess?.(result);
        void message.success(isAvatar ? '头像上传成功' : '封面上传成功');
      } catch (error) {
        const err = error instanceof Error ? error : new Error('上传失败');
        onError?.(err);
        void message.error(err.message);
      } finally {
        setUploading(false);
      }
    },
  };

  return (
    <Space orientation="vertical" size={isAvatar ? 6 : 'small'} style={{ width: '100%' }}>
      {value ? (
        <div className={isAvatar ? 'cover-image-field-avatar' : undefined} style={{ position: 'relative', display: 'inline-block' }}>
          <MediaPreviewImage
            src={resolveOssAssetUrl(value)}
            alt={resolvedPreviewAlt}
            className={isAvatar ? 'media-preview-thumb--avatar' : undefined}
          />
          {!disabled ? (
            <Button
              danger
              size="small"
              type={isAvatar ? 'link' : 'default'}
              icon={<DeleteOutlined />}
              style={{ marginTop: isAvatar ? 4 : 8, paddingInline: isAvatar ? 0 : undefined }}
              onClick={() => onChange?.(null)}
            >
              {resolvedRemoveLabel}
            </Button>
          ) : null}
        </div>
      ) : (
        <Upload {...uploadProps}>
          <Button
            icon={uploading ? <LoadingOutlined /> : <PlusOutlined />}
            disabled={disabled || uploading}
            className={isAvatar ? 'cover-image-field-avatar-upload' : undefined}
          >
            {resolvedUploadLabel}
          </Button>
        </Upload>
      )}
      {resolvedHint ? <Typography.Text type="secondary" style={{ fontSize: isAvatar ? 12 : undefined, lineHeight: 1.4 }}>{resolvedHint}</Typography.Text> : null}
    </Space>
  );
}
