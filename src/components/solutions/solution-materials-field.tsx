'use client';

import { DeleteOutlined, LoadingOutlined, UploadOutlined } from '@ant-design/icons';
import { Button, Input, Space, Upload, message } from 'antd';
import { useState } from 'react';

import type { SolutionMaterial } from '@/lib/solution-content';
import { uploadMediaFile } from '@/lib/media-upload';

type SolutionMaterialsFieldProps = {
  value?: SolutionMaterial[];
  onChange?: (value: SolutionMaterial[]) => void;
  folder?: string;
};

export function SolutionMaterialsField({
  value = [],
  onChange,
  folder = 'solutions/materials',
}: SolutionMaterialsFieldProps) {
  const items = value ?? [];
  const [uploadingCount, setUploadingCount] = useState(0);
  const uploading = uploadingCount > 0;

  function updateItem(index: number, patch: Partial<SolutionMaterial>) {
    const next = items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item));
    onChange?.(next);
  }

  function removeItem(index: number) {
    onChange?.(items.filter((_, itemIndex) => itemIndex !== index));
  }

  return (
    <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
      {items.map((item, index) => (
        <div key={`${item.url}-${index}`} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Input
            style={{ flex: 1 }}
            placeholder="附件名称"
            value={item.name}
            onChange={(event) => updateItem(index, { name: event.target.value })}
          />
          <a href={item.url} target="_blank" rel="noreferrer">查看</a>
          <Button danger icon={<DeleteOutlined />} onClick={() => removeItem(index)} />
        </div>
      ))}
      <Upload
        showUploadList={false}
        disabled={uploading}
        customRequest={async ({ file, onError, onSuccess }) => {
          setUploadingCount((count) => count + 1);
          try {
            const uploaded = await uploadMediaFile(file as File, { folder, kind: 'document' });
            onChange?.([...items, {
              name: (file as File).name,
              url: uploaded.url,
              mimeType: uploaded.contentType ?? (file as File).type ?? 'application/octet-stream',
            }]);
            onSuccess?.(uploaded);
          } catch (error) {
            void message.error(error instanceof Error ? error.message : '附件上传失败');
            onError?.(error as Error);
          } finally {
            setUploadingCount((count) => Math.max(0, count - 1));
          }
        }}
      >
        <Button icon={uploading ? <LoadingOutlined /> : <UploadOutlined />} loading={uploading} disabled={uploading}>
          {uploading ? '上传中…' : '上传附件'}
        </Button>
      </Upload>
    </Space>
  );
}
