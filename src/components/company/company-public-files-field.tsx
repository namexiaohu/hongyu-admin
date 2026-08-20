'use client';

import { DeleteOutlined, LoadingOutlined, UploadOutlined } from '@ant-design/icons';
import { Button, Input, Space, Upload, message } from 'antd';
import { useState } from 'react';

import type { CompanyPublicFile } from '@/lib/company-profile';
import { uploadMediaFile } from '@/lib/media-upload';
import { resolveOssAssetUrl } from '@/lib/oss-asset-url';

type CompanyPublicFilesFieldProps = {
  value?: CompanyPublicFile[];
  onChange?: (value: CompanyPublicFile[]) => void;
  folder?: string;
};

export function CompanyPublicFilesField({
  value = [],
  onChange,
  folder = 'company/files',
}: CompanyPublicFilesFieldProps) {
  const items = value ?? [];
  const [uploadingCount, setUploadingCount] = useState(0);
  const uploading = uploadingCount > 0;

  function updateItem(index: number, patch: Partial<CompanyPublicFile>) {
    onChange?.(items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
  }

  function removeItem(index: number) {
    onChange?.(items.filter((_, itemIndex) => itemIndex !== index));
  }

  return (
    <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
      {items.map((item, index) => (
        <div key={`${item.url}-${index}`} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Input
            style={{ flex: 1 }}
            placeholder="文件名称"
            value={item.name}
            onChange={(event) => updateItem(index, { name: event.target.value })}
          />
          {item.url ? (
            <a href={resolveOssAssetUrl(item.url)} target="_blank" rel="noreferrer">查看</a>
          ) : null}
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
              url: uploaded.key || uploaded.url,
            }]);
            onSuccess?.(uploaded);
          } catch (error) {
            void message.error(error instanceof Error ? error.message : '文件上传失败');
            onError?.(error as Error);
          } finally {
            setUploadingCount((count) => Math.max(0, count - 1));
          }
        }}
      >
        <Button icon={uploading ? <LoadingOutlined /> : <UploadOutlined />} loading={uploading} disabled={uploading}>
          {uploading ? '上传中…' : '上传文件'}
        </Button>
      </Upload>
    </Space>
  );
}
