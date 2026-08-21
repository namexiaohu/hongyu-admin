'use client';

import { DeleteOutlined, LoadingOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Space, Typography, Upload, message } from 'antd';
import type { UploadProps } from 'antd';
import { useState } from 'react';

import { MediaPreviewVideo } from '@/components/editorial/media-preview-video';
import {
  MAX_VIDEO_UPLOAD_BYTES,
  VIDEO_UPLOAD_MIME_TYPES,
  uploadMediaFile,
} from '@/lib/media-upload';
import { resolveOssAssetUrl } from '@/lib/oss-asset-url';

type ProductVideoFieldProps = {
  value?: string | null;
  onChange?: (value: string | null) => void;
  disabled?: boolean;
  folder?: string;
};

export function ProductVideoField({
  value,
  onChange,
  disabled = false,
  folder = 'products/videos',
}: ProductVideoFieldProps) {
  const [uploading, setUploading] = useState(false);

  const uploadProps: UploadProps = {
    accept: VIDEO_UPLOAD_MIME_TYPES.join(','),
    showUploadList: false,
    disabled: disabled || uploading,
    beforeUpload: (file) => {
      if (!VIDEO_UPLOAD_MIME_TYPES.includes(file.type as (typeof VIDEO_UPLOAD_MIME_TYPES)[number])) {
        void message.error('仅支持 MP4、WebM、MOV、AVI、MPEG、OGG 视频');
        return Upload.LIST_IGNORE;
      }
      if (file.size > MAX_VIDEO_UPLOAD_BYTES) {
        void message.error('视频大小不能超过 100MB');
        return Upload.LIST_IGNORE;
      }
      return true;
    },
    customRequest: async ({ file, onError, onSuccess }) => {
      try {
        setUploading(true);
        const result = await uploadMediaFile(file as File, { kind: 'video', folder });
        onChange?.(result.key);
        onSuccess?.(result);
        void message.success('视频上传成功');
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
    <Space orientation="vertical" size="small" style={{ width: '100%' }}>
      {value ? (
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <MediaPreviewVideo src={resolveOssAssetUrl(value)} />
          {!disabled ? (
            <Button
              danger
              size="small"
              icon={<DeleteOutlined />}
              style={{ marginTop: 8 }}
              onClick={() => onChange?.(null)}
            >
              移除视频
            </Button>
          ) : null}
        </div>
      ) : (
        <Upload {...uploadProps}>
          <Button icon={uploading ? <LoadingOutlined /> : <PlusOutlined />} disabled={disabled || uploading}>
            上传产品视频
          </Button>
        </Upload>
      )}
      <Typography.Text type="secondary">
        仅支持单个视频（MP4 / WebM / MOV 等），最大 100MB，上传至对象存储。有视频时前台详情页优先展示。
      </Typography.Text>
    </Space>
  );
}
