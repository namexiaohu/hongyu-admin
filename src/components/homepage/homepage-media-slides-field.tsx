'use client';

import { DeleteOutlined, DownOutlined, LoadingOutlined, PlusOutlined, UpOutlined } from '@ant-design/icons';
import { Button, Space, Upload, message } from 'antd';
import type { UploadProps } from 'antd';
import { useState } from 'react';

import { MediaPreviewImage } from '@/components/editorial/media-preview-image';
import { MediaPreviewVideo } from '@/components/editorial/media-preview-video';
import {
  IMAGE_UPLOAD_MIME_TYPES,
  MAX_IMAGE_UPLOAD_BYTES,
  MAX_VIDEO_UPLOAD_BYTES,
  VIDEO_UPLOAD_MIME_TYPES,
  uploadMediaFile,
} from '@/lib/media-upload';
import { createSlideId, type HomepageMediaSlide } from '@/lib/homepage-config';
import { resolveOssAssetUrl } from '@/lib/oss-asset-url';

type HomepageMediaSlidesFieldProps = {
  value?: HomepageMediaSlide[];
  onChange?: (value: HomepageMediaSlide[]) => void;
  folder?: string;
};

export function HomepageMediaSlidesField({
  value = [],
  onChange,
  folder = 'homepage/slides',
}: HomepageMediaSlidesFieldProps) {
  const items = value ?? [];
  const [uploading, setUploading] = useState(false);

  function moveItem(index: number, offset: number) {
    const nextIndex = index + offset;
    if (nextIndex < 0 || nextIndex >= items.length) return;
    const next = [...items];
    const [item] = next.splice(index, 1);
    if (!item) return;
    next.splice(nextIndex, 0, item);
    onChange?.(next);
  }

  function removeItem(index: number) {
    onChange?.(items.filter((_, itemIndex) => itemIndex !== index));
  }

  const accept = [...IMAGE_UPLOAD_MIME_TYPES, ...VIDEO_UPLOAD_MIME_TYPES].join(',');

  const uploadProps: UploadProps = {
    accept,
    showUploadList: false,
    disabled: uploading,
    beforeUpload: (file) => {
      const isImage = (IMAGE_UPLOAD_MIME_TYPES as readonly string[]).includes(file.type);
      const isVideo = (VIDEO_UPLOAD_MIME_TYPES as readonly string[]).includes(file.type);
      if (!isImage && !isVideo) {
        void message.error('仅支持图片或视频文件');
        return Upload.LIST_IGNORE;
      }
      if (isImage && file.size > MAX_IMAGE_UPLOAD_BYTES) {
        void message.error('图片大小不能超过 10MB');
        return Upload.LIST_IGNORE;
      }
      if (isVideo && file.size > MAX_VIDEO_UPLOAD_BYTES) {
        void message.error('视频大小不能超过 100MB');
        return Upload.LIST_IGNORE;
      }
      return true;
    },
    customRequest: async ({ file, onError, onSuccess }) => {
      try {
        setUploading(true);
        const raw = file as File;
        const kind = (IMAGE_UPLOAD_MIME_TYPES as readonly string[]).includes(raw.type) ? 'image' : 'video';
        const result = await uploadMediaFile(raw, { kind, folder });
        onChange?.([
          ...items,
          {
            id: createSlideId(),
            url: result.key || result.url,
            mediaType: kind,
          },
        ]);
        onSuccess?.(result);
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
    <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
      {items.map((item, index) => {
        const previewUrl = resolveOssAssetUrl(item.url) || item.url;
        return (
          <div
            key={item.id || `${item.url}-${index}`}
            style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}
          >
            {item.mediaType === 'video' ? (
              <MediaPreviewVideo src={previewUrl} />
            ) : (
              <MediaPreviewImage src={previewUrl} />
            )}
            <span style={{ color: 'rgba(0,0,0,0.45)', fontSize: 12 }}>
              {item.mediaType === 'video' ? '视频' : '图片'}
            </span>
            <Button icon={<UpOutlined />} disabled={index === 0} onClick={() => moveItem(index, -1)} />
            <Button
              icon={<DownOutlined />}
              disabled={index === items.length - 1}
              onClick={() => moveItem(index, 1)}
            />
            <Button danger icon={<DeleteOutlined />} onClick={() => removeItem(index)} />
          </div>
        );
      })}
      <Upload {...uploadProps}>
        <Button icon={uploading ? <LoadingOutlined /> : <PlusOutlined />}>添加图片/视频</Button>
      </Upload>
    </Space>
  );
}
