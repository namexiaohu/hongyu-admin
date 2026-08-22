'use client';

import { CheckOutlined, DeleteOutlined, LoadingOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Modal, Popconfirm, Segmented, Space, Typography, Upload, message } from 'antd';
import type { UploadProps } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';

import type { AdminMediaAsset } from '@/lib/media-assets';
import { IMAGE_UPLOAD_MIME_TYPES, MAX_IMAGE_UPLOAD_BYTES } from '@/lib/media-upload';
import {
  getSharedBackgroundMediaAssets,
  peekSharedBackgroundMediaAssets,
  removeSharedBackgroundMediaAsset,
  setSharedBackgroundMediaAssets,
} from '@/lib/background-media-cache';
import {
  MEDIA_ASSET_TYPE_BACKGROUND,
  PARTNER_CENTER_IMAGE_PRESETS,
  PARTNER_CENTER_SOLID_PRESETS,
  SOLID_BACKGROUND_DEFAULT,
  SUMMIT_DEFAULT_SOLID_PREVIEW_CSS,
  type PartnerCenterBackgroundMode,
  getPartnerCenterImagePreset,
  getPartnerCenterSolidPreset,
} from '@/lib/partner-center-background-presets';

export type PartnerCenterBackgroundValue = {
  mode: PartnerCenterBackgroundMode;
  value: string;
  previewUrl?: string;
};

type Props = {
  value?: PartnerCenterBackgroundValue | null;
  onChange?: (value: PartnerCenterBackgroundValue) => void;
  disabled?: boolean;
  /** When true, "solid" applies the default page hero background without a color picker */
  solidImmediate?: boolean;
};

type PickerKind = 'solid' | 'preset' | 'upload';

export function PartnerCenterBackgroundField({
  value,
  onChange,
  disabled = false,
  solidImmediate = false,
}: Props) {
  const assetType = MEDIA_ASSET_TYPE_BACKGROUND;
  const mode = value?.mode ?? '';
  const selectedValue = value?.value ?? '';
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerKind, setPickerKind] = useState<PickerKind>('solid');
  const [uploadItems, setUploadItems] = useState<AdminMediaAsset[]>([]);
  const [loadingUploads, setLoadingUploads] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [modeCache, setModeCache] = useState<Partial<Record<PartnerCenterBackgroundMode, { value: string; previewUrl: string }>>>({});

  const solid = mode === 'solid' && !solidImmediate ? getPartnerCenterSolidPreset(selectedValue) : null;
  const isSolidDefault = solidImmediate && mode === 'solid';
  const preset = mode === 'preset' ? getPartnerCenterImagePreset(selectedValue) : null;
  const previewUrl = mode === 'upload'
    ? (value?.previewUrl || uploadItems.find((item) => item.storageKey === selectedValue)?.url || '')
    : (preset?.fullUrl ?? '');

  useEffect(() => {
    if (!value?.mode || !value.value) return;
    setModeCache((prev) => ({
      ...prev,
      [value.mode]: {
        value: value.value,
        previewUrl: value.previewUrl ?? '',
      },
    }));
  }, [value?.mode, value?.value, value?.previewUrl]);

  const loadUploads = useCallback(async (force = false) => {
    if (!force) {
      const cached = peekSharedBackgroundMediaAssets();
      if (cached) {
        setUploadItems(cached);
        setLoadingUploads(false);
        return;
      }
    }

    setLoadingUploads(true);
    try {
      const items = await getSharedBackgroundMediaAssets({ force });
      setUploadItems(items);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '加载图库失败');
    } finally {
      setLoadingUploads(false);
    }
  }, []);

  useEffect(() => {
    if (pickerOpen && pickerKind === 'upload') {
      void loadUploads(false);
    }
  }, [pickerOpen, pickerKind, loadUploads]);

  // Prefetch once when the entity editor mounts this field
  useEffect(() => {
    if (peekSharedBackgroundMediaAssets()) return;
    void getSharedBackgroundMediaAssets().catch(() => undefined);
  }, []);

  function setMode(next: PartnerCenterBackgroundMode) {
    if (disabled) return;
    if (next === mode) return;

    if (solidImmediate && next === 'solid') {
      const nextValue = { mode: 'solid' as const, value: SOLID_BACKGROUND_DEFAULT, previewUrl: '' };
      setModeCache((prev) => ({ ...prev, solid: { value: SOLID_BACKGROUND_DEFAULT, previewUrl: '' } }));
      onChange?.(nextValue);
      return;
    }

    const mergedCache = {
      ...modeCache,
      ...(mode
        ? { [mode]: { value: selectedValue, previewUrl: value?.previewUrl ?? '' } }
        : {}),
    };
    setModeCache(mergedCache);
    const cached = mergedCache[next];
    onChange?.({
      mode: next,
      value: cached?.value ?? '',
      previewUrl: cached?.previewUrl ?? '',
    });
  }

  function openPicker() {
    if (disabled) return;
    if (solidImmediate && mode === 'solid') return;
    if (!mode) {
      message.warning('请先选择大背景图类型');
      return;
    }
    setPickerKind(mode as PickerKind);
    setPickerOpen(true);
  }

  function selectSolid(id: string) {
    const next = { mode: 'solid' as const, value: id, previewUrl: '' };
    setModeCache((prev) => ({ ...prev, solid: { value: id, previewUrl: '' } }));
    onChange?.(next);
    setPickerOpen(false);
  }

  function selectPreset(id: string) {
    const item = getPartnerCenterImagePreset(id);
    const preview = item?.fullUrl ?? '';
    setModeCache((prev) => ({ ...prev, preset: { value: id, previewUrl: preview } }));
    onChange?.({ mode: 'preset', value: id, previewUrl: preview });
    setPickerOpen(false);
  }

  function selectUpload(asset: AdminMediaAsset) {
    setModeCache((prev) => ({ ...prev, upload: { value: asset.storageKey, previewUrl: asset.url } }));
    onChange?.({ mode: 'upload', value: asset.storageKey, previewUrl: asset.url });
    setPickerOpen(false);
  }

  async function deleteUpload(asset: AdminMediaAsset) {
    if (deletingId) return;
    try {
      setDeletingId(asset.id);
      const response = await fetch(`/api/admin/media-assets/${asset.id}`, { method: 'DELETE' });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.message || '删除失败');

      const next = removeSharedBackgroundMediaAsset(asset.id);
      setUploadItems(next);
      if (mode === 'upload' && selectedValue === asset.storageKey) {
        clear();
      }
      void message.success('已删除');
    } catch (error) {
      void message.error(error instanceof Error ? error.message : '删除失败');
    } finally {
      setDeletingId(null);
    }
  }

  function clear() {
    setModeCache({});
    onChange?.({ mode: '', value: '', previewUrl: '' });
  }

  const uploadProps: UploadProps = useMemo(() => ({
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
        const formData = new FormData();
        formData.append('file', file as File);
        formData.append('type', assetType);
        const r = await fetch('/api/admin/media-assets', { method: 'POST', body: formData });
        const data = await r.json().catch(() => null);
        if (!r.ok) throw new Error(data?.message || '上传失败');
        const asset = data as AdminMediaAsset;
        // Refresh shared library so the new upload is included, then reuse cache next open
        const items = await getSharedBackgroundMediaAssets({ force: true });
        setSharedBackgroundMediaAssets(items);
        setUploadItems(items);
        onChange?.({ mode: 'upload', value: asset.storageKey, previewUrl: asset.url });
        setModeCache((prev) => ({ ...prev, upload: { value: asset.storageKey, previewUrl: asset.url } }));
        setPickerOpen(false);
        onSuccess?.(asset);
        void message.success('大背景图上传成功');
      } catch (error) {
        const err = error instanceof Error ? error : new Error('上传失败');
        onError?.(err);
        void message.error(err.message);
      } finally {
        setUploading(false);
      }
    },
  }), [assetType, disabled, uploading, onChange]);

  const pickerTitle =
    pickerKind === 'solid' ? '选择纯色大背景图'
      : pickerKind === 'preset' ? '选择预置大背景图'
        : '选择已上传大背景图';

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Segmented
        disabled={disabled}
        value={mode || undefined}
        onChange={(v) => setMode(v as PartnerCenterBackgroundMode)}
        options={[
          { label: '纯色', value: 'solid' },
          { label: '预置图库', value: 'preset' },
          { label: '上传图库', value: 'upload' },
        ]}
      />

      <div
        style={{
          width: '100%',
          maxWidth: 420,
          height: 140,
          borderRadius: 10,
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          background: isSolidDefault
            ? SUMMIT_DEFAULT_SOLID_PREVIEW_CSS
            : (solid?.css || '#f1f5f9'),
          position: 'relative',
        }}
      >
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="大背景图预览" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : isSolidDefault ? (
          <div style={{ position: 'absolute', inset: 0, background: SUMMIT_DEFAULT_SOLID_PREVIEW_CSS }} />
        ) : solid ? (
          <div style={{ position: 'absolute', inset: 0, background: solid.css }} />
        ) : (
          <div style={{ height: '100%', display: 'grid', placeItems: 'center', color: '#94a3b8', fontSize: 13 }}>
            {mode ? '尚未选择大背景图' : '请先选择类型'}
          </div>
        )}
      </div>

      <Space wrap>
        {!(solidImmediate && mode === 'solid') ? (
          <Button type="default" disabled={disabled || !mode} onClick={openPicker}>
            选择大背景图…
          </Button>
        ) : null}
        {(mode || selectedValue) ? (
          <Button danger type="text" disabled={disabled} onClick={clear}>
            清除
          </Button>
        ) : null}
      </Space>

      {isSolidDefault ? <Typography.Text type="secondary">已选纯色：默认深色背景</Typography.Text> : null}
      {solid ? <Typography.Text type="secondary">已选纯色：{solid.label}</Typography.Text> : null}
      {preset ? <Typography.Text type="secondary">已选预置：{preset.label}</Typography.Text> : null}
      {mode === 'upload' && selectedValue ? (
        <Typography.Text type="secondary">已选上传图</Typography.Text>
      ) : null}

      <Modal
        open={pickerOpen}
        title={pickerTitle}
        onCancel={() => setPickerOpen(false)}
        footer={null}
        width={pickerKind === 'solid' ? 640 : 880}
        destroyOnHidden
      >
        {pickerKind === 'solid' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {PARTNER_CENTER_SOLID_PRESETS.map((item) => {
              const active = selectedValue === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => selectSolid(item.id)}
                  style={{
                    border: active ? '2px solid #2563eb' : '1px solid #e2e8f0',
                    borderRadius: 10,
                    padding: 0,
                    overflow: 'hidden',
                    cursor: 'pointer',
                    background: '#fff',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ height: 72, background: item.css }} />
                  <div style={{ padding: '8px 10px', fontSize: 12, display: 'flex', justifyContent: 'space-between' }}>
                    <span>{item.label}</span>
                    {active ? <CheckOutlined style={{ color: '#2563eb' }} /> : null}
                  </div>
                </button>
              );
            })}
          </div>
        ) : null}

        {pickerKind === 'preset' ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: 12,
              maxHeight: 520,
              overflowX: 'hidden',
              overflowY: 'auto',
              paddingRight: 10,
              width: '100%',
              boxSizing: 'border-box',
            }}
          >
            {PARTNER_CENTER_IMAGE_PRESETS.map((item) => {
              const active = selectedValue === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => selectPreset(item.id)}
                  style={{
                    border: active ? '2px solid #2563eb' : '1px solid #e2e8f0',
                    borderRadius: 10,
                    padding: 0,
                    overflow: 'hidden',
                    cursor: 'pointer',
                    background: '#fff',
                    textAlign: 'left',
                    minWidth: 0,
                    width: '100%',
                    boxSizing: 'border-box',
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.thumbUrl}
                    alt={item.label}
                    style={{ width: '100%', height: 110, objectFit: 'cover', display: 'block' }}
                  />
                  <div style={{ padding: '8px 10px' }}>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{item.label}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>{item.credit}</div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : null}

        {pickerKind === 'upload' ? (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Upload {...uploadProps}>
              <Button type="primary" icon={uploading ? <LoadingOutlined /> : <PlusOutlined />} loading={uploading}>
                上传大背景图
              </Button>
            </Upload>
            {loadingUploads ? (
              <Typography.Text type="secondary">加载中…</Typography.Text>
            ) : uploadItems.length === 0 ? (
              <Typography.Text type="secondary">暂无已上传的大背景图，请先上传</Typography.Text>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                  gap: 12,
                  maxHeight: 480,
                  overflowX: 'hidden',
                  overflowY: 'auto',
                  paddingRight: 10,
                  width: '100%',
                  boxSizing: 'border-box',
                }}
              >
                {uploadItems.map((item) => {
                  const active = selectedValue === item.storageKey;
                  const deleting = deletingId === item.id;
                  return (
                    <div
                      key={item.id}
                      style={{
                        border: active ? '2px solid #2563eb' : '1px solid #e2e8f0',
                        borderRadius: 10,
                        padding: 0,
                        overflow: 'hidden',
                        background: '#fff',
                        minWidth: 0,
                        width: '100%',
                        boxSizing: 'border-box',
                        position: 'relative',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => selectUpload(item)}
                        style={{
                          border: 'none',
                          padding: 0,
                          margin: 0,
                          width: '100%',
                          background: 'transparent',
                          cursor: 'pointer',
                          textAlign: 'left',
                          display: 'block',
                        }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.url}
                          alt={item.filename || '大背景图'}
                          style={{ width: '100%', height: 110, objectFit: 'cover', display: 'block' }}
                        />
                        <div
                          style={{
                            padding: '8px 10px',
                            fontSize: 11,
                            color: '#64748b',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {item.filename || item.id.slice(0, 8)}
                        </div>
                      </button>
                      <Popconfirm
                        title="删除这张大背景图？"
                        description="删除后不可恢复，引用该图的实体需重新选择。"
                        okText="删除"
                        cancelText="取消"
                        okButtonProps={{ danger: true, loading: deleting }}
                        onConfirm={(event) => {
                          event?.stopPropagation();
                          void deleteUpload(item);
                        }}
                        onCancel={(event) => event?.stopPropagation()}
                      >
                        <Button
                          type="text"
                          size="small"
                          danger
                          icon={deleting ? <LoadingOutlined /> : <DeleteOutlined />}
                          disabled={disabled || Boolean(deletingId)}
                          onClick={(event) => event.stopPropagation()}
                          aria-label="删除大背景图"
                          style={{
                            position: 'absolute',
                            top: 6,
                            right: 6,
                            background: 'rgba(255,255,255,0.92)',
                            boxShadow: '0 1px 4px rgba(15,23,42,0.12)',
                          }}
                        />
                      </Popconfirm>
                    </div>
                  );
                })}
              </div>
            )}
          </Space>
        ) : null}
      </Modal>
    </Space>
  );
}
