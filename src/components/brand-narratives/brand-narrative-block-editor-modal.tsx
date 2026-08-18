'use client';

import { DeleteOutlined, DownOutlined, PlusOutlined, UpOutlined } from '@ant-design/icons';
import { Button, Empty, Form, Input, Modal, Select, Space, Tabs, Tooltip } from 'antd';
import { useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react';

import { ContentTranslateButton } from '@/components/admin/content-translate-button';
import { ContentEditorLocaleTab } from '@/components/admin/content-editor-locale-tab';
import { BrandNarrativeBlockItemEditorModal, type BrandNarrativeBlockItemEditorHandle } from '@/components/brand-narratives/brand-narrative-block-item-editor-modal';
import { BrandNarrativeBlockItemList } from '@/components/brand-narratives/brand-narrative-block-item-list';
import {
  brandNarrativeSplitLayoutLabels,
  brandNarrativeSplitLayouts,
  brandNarrativeSummaryLayoutLabels,
  brandNarrativeSummaryLayouts,
  createBrandNarrativeCarouselSlide,
  createEmptyBlockLocaleCopy,
  getBrandNarrativeBlockLabel,
  hasLocaleCopyContent,
  isSplitLayout,
  isSummaryLayout,
  summaryItemUsesCoverImage,
  writeLocaleCopy,
  type BrandNarrativeBlockDraft,
  type BrandNarrativeBlockItemDraft,
  type BrandNarrativeBlockLocaleCopy,
  type BrandNarrativeSplitLayout,
  type BrandNarrativeSummaryLayout,
} from '@/lib/brand-narrative-blocks';
import { applyNonemptyTranslatedFields } from '@/lib/content-translate-config';
import type { AdminSiteLanguageRow } from '@/server/admin/languages';

export type BrandNarrativeBlockEditorHandle = {
  flush: () => BrandNarrativeBlockDraft | null;
};

type BrandNarrativeBlockEditorModalProps = {
  open: boolean;
  block: BrandNarrativeBlockDraft | null;
  activeLanguages: AdminSiteLanguageRow[];
  disabled?: boolean;
  saving?: boolean;
  onChange: (block: BrandNarrativeBlockDraft) => void;
  onSave: (block: BrandNarrativeBlockDraft) => void;
  onClose: () => void;
  ref?: Ref<BrandNarrativeBlockEditorHandle>;
};

function readLocaleForm(values: BrandNarrativeBlockLocaleCopy): BrandNarrativeBlockLocaleCopy {
  return {
    smallTitle: values.smallTitle ?? '',
    largeTitle: values.largeTitle ?? '',
    description: values.description ?? '',
    buttonLabel: values.buttonLabel ?? '',
  };
}

export function BrandNarrativeBlockEditorModal({
  open,
  block,
  activeLanguages,
  disabled = false,
  saving = false,
  onChange,
  onSave,
  onClose,
  ref,
}: BrandNarrativeBlockEditorModalProps) {
  const [form] = Form.useForm<BrandNarrativeBlockLocaleCopy>();
  const [activeLocale, setActiveLocale] = useState(activeLanguages[0]?.code ?? 'zh');
  const [editingItem, setEditingItem] = useState<BrandNarrativeBlockItemDraft | null>(null);
  const blockRef = useRef<BrandNarrativeBlockDraft | null>(block);
  const itemEditorRef = useRef<BrandNarrativeBlockItemEditorHandle>(null);
  const defaultLocale = activeLanguages.find((language) => language.isDefault)?.code ?? activeLanguages[0]?.code ?? '';

  function currentBlock() {
    return blockRef.current ?? block;
  }

  function getMergedBlock(): BrandNarrativeBlockDraft | null {
    const source = currentBlock();
    if (!source) return null;
    return mergeCurrentLocale(source);
  }

  function getDefaultBlockCopy(): BrandNarrativeBlockLocaleCopy {
    const merged = getMergedBlock();
    return merged?.locales[defaultLocale] ?? createEmptyBlockLocaleCopy();
  }

  function getActiveBlockCopy(): BrandNarrativeBlockLocaleCopy {
    return readLocaleForm(form.getFieldsValue(true));
  }

  function getDefaultSourceFields(): Record<string, string> {
    const copy = getDefaultBlockCopy();
    return {
      smallTitle: copy.smallTitle,
      largeTitle: copy.largeTitle,
      description: copy.description,
      buttonLabel: copy.buttonLabel ?? '',
    };
  }

  function hasTargetLocaleContent() {
    return hasLocaleCopyContent(getActiveBlockCopy());
  }

  function handleTranslated(fields: Record<string, string>) {
    const source = currentBlock();
    if (!source) return;
    const nextCopy = applyNonemptyTranslatedFields(getActiveBlockCopy(), fields);
    form.setFieldsValue(nextCopy);
    emit(mergeCurrentLocale(source));
  }

  useEffect(() => {
    if (!open || !block) {
      blockRef.current = null;
      return;
    }
    blockRef.current = block;
    const firstLocale = activeLanguages[0]?.code ?? 'zh';
    setActiveLocale(firstLocale);
    setEditingItem(null);
    form.setFieldsValue(block.locales[firstLocale] ?? createEmptyBlockLocaleCopy());
    // 仅在打开或切换区块时重置，避免父组件重渲染把当前语言表单冲掉。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, block?.id]);

  function emit(next: BrandNarrativeBlockDraft) {
    blockRef.current = next;
    onChange(next);
  }

  function mergeCurrentLocale(nextBlock: BrandNarrativeBlockDraft) {
    return {
      ...nextBlock,
      locales: writeLocaleCopy(
        nextBlock.locales,
        activeLocale,
        readLocaleForm(form.getFieldsValue(true)),
      ),
    };
  }

  function patchShared(patch: Partial<BrandNarrativeBlockDraft>) {
    const source = currentBlock();
    if (!source) return;
    emit(mergeCurrentLocale({ ...source, ...patch }));
  }

  function switchLocale(locale: string) {
    const source = currentBlock();
    if (!source) return;
    const nextBlock = mergeCurrentLocale(source);
    emit(nextBlock);
    setActiveLocale(locale);
    form.setFieldsValue(nextBlock.locales[locale] ?? createEmptyBlockLocaleCopy());
  }

  function handleClose() {
    flush();
    setEditingItem(null);
    onClose();
  }

  function flush(): BrandNarrativeBlockDraft | null {
    if (!open) return null;
    const flushedItem = editingItem ? (itemEditorRef.current?.flush() ?? null) : null;
    const source = currentBlock();
    if (!source) return null;
    const withItem = flushedItem
      ? { ...source, items: source.items.map((item) => (item.id === flushedItem.id ? flushedItem : item)) }
      : source;
    const next = mergeCurrentLocale(withItem);
    emit(next);
    return next;
  }

  useImperativeHandle(ref, () => ({ flush }));

  function handleSave() {
    if (disabled) return;
    const next = flush();
    setEditingItem(null);
    if (next) onSave(next);
  }

  function handleItemChange(next: BrandNarrativeBlockItemDraft) {
    const source = currentBlock();
    if (!source) return;
    setEditingItem(next);
    patchShared({
      items: source.items.map((item) => (item.id === next.id ? next : item)),
    });
  }

  const showItemList = block?.type === 'summary' || block?.type === 'timeline' || block?.type === 'course';
  const editingItemIndex = editingItem
    ? (block?.items.findIndex((item) => item.id === editingItem.id) ?? -1)
    : -1;

  return (
    <>
      <Modal
        title={block ? `编辑区块 · ${getBrandNarrativeBlockLabel(block)}` : '编辑区块'}
        open={open}
        onCancel={handleClose}
        footer={null}
        width={960}
        destroyOnHidden
        className="content-editor-modal brand-editor-modal"
        rootClassName="content-editor-modal-wrap"
        style={{ top: 64 }}
        styles={{ body: { overflow: 'visible', minWidth: 0 } }}
      >
        {block ? (
          <Space orientation="vertical" size="large" style={{ width: '100%', maxWidth: '100%', minWidth: 0 }}>
            {disabled ? null : (
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Tooltip title="提前把全部区块写入数据库，便于先落库。叙事主体保存时也会同时保存区块。">
                  <Button type="primary" loading={saving} onClick={handleSave}>
                    保存
                  </Button>
                </Tooltip>
              </div>
            )}
            <div className="content-editor-shared-section">
              <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
                {block.type === 'split' ? (
                  <>
                    <div>
                      <div style={{ marginBottom: 8 }}>布局风格</div>
                      <Select
                        style={{ width: '100%' }}
                        value={isSplitLayout(block.layout) ? block.layout : 'image-left'}
                        options={brandNarrativeSplitLayouts.map((layout) => ({
                          value: layout,
                          label: brandNarrativeSplitLayoutLabels[layout],
                        }))}
                        onChange={(layout: BrandNarrativeSplitLayout) => patchShared({ layout })}
                      />
                    </div>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                        <span>轮播图</span>
                        <Button
                          type="primary"
                          size="small"
                          icon={<PlusOutlined />}
                          onClick={() => patchShared({
                            carouselImages: [...(block.carouselImages ?? []), createBrandNarrativeCarouselSlide()],
                          })}
                        >
                          添加轮播图
                        </Button>
                      </div>
                      {(block.carouselImages ?? []).length === 0 ? (
                        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="尚未添加轮播图" />
                      ) : (
                        <Space orientation="vertical" size="small" style={{ width: '100%' }}>
                          {(block.carouselImages ?? []).map((slide, index, slides) => (
                            <div key={slide.id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                              <Input
                                placeholder="图片 URL"
                                value={slide.url}
                                onChange={(event) => {
                                  const next = slides.map((item) => (
                                    item.id === slide.id ? { ...item, url: event.target.value } : item
                                  ));
                                  patchShared({ carouselImages: next });
                                }}
                              />
                              <Button
                                type="text"
                                size="small"
                                icon={<UpOutlined />}
                                disabled={index === 0}
                                onClick={() => {
                                  const next = [...slides];
                                  const [item] = next.splice(index, 1);
                                  next.splice(index - 1, 0, item);
                                  patchShared({ carouselImages: next });
                                }}
                              />
                              <Button
                                type="text"
                                size="small"
                                icon={<DownOutlined />}
                                disabled={index === slides.length - 1}
                                onClick={() => {
                                  const next = [...slides];
                                  const [item] = next.splice(index, 1);
                                  next.splice(index + 1, 0, item);
                                  patchShared({ carouselImages: next });
                                }}
                              />
                              <Button
                                type="text"
                                size="small"
                                danger
                                icon={<DeleteOutlined />}
                                onClick={() => patchShared({
                                  carouselImages: slides.filter((item) => item.id !== slide.id),
                                })}
                              />
                            </div>
                          ))}
                        </Space>
                      )}
                    </div>
                  </>
                ) : null}

                {block.type === 'summary' ? (
                  <div>
                    <div style={{ marginBottom: 8 }}>布局风格</div>
                    <Select
                      style={{ width: '100%' }}
                      value={isSummaryLayout(block.layout) ? block.layout : 'single-row'}
                      options={brandNarrativeSummaryLayouts.map((layout) => ({
                        value: layout,
                        label: brandNarrativeSummaryLayoutLabels[layout],
                      }))}
                      onChange={(layout: BrandNarrativeSummaryLayout) => patchShared({ layout })}
                    />
                  </div>
                ) : null}

                {block.type === 'cta' ? (
                  <div>
                    <div style={{ marginBottom: 8 }}>导向 URL</div>
                    <Input
                      placeholder="https:// 或 /contact"
                      value={block.href ?? ''}
                      onChange={(event) => patchShared({ href: event.target.value })}
                    />
                  </div>
                ) : null}

                {showItemList ? (
                  <BrandNarrativeBlockItemList
                    items={block.items}
                    onChange={(items) => patchShared({ items })}
                    onEdit={setEditingItem}
                  />
                ) : null}
              </Space>
            </div>

            <Form form={form} layout="vertical" preserve disabled={disabled}>
              <div className="content-editor-layout">
                <div className="content-editor-locale-nav">
                  {activeLanguages.map((language) => (
                    <ContentEditorLocaleTab
                      key={language.code}
                      language={language}
                      isActive={language.code === activeLocale}
                      persisted={hasLocaleCopyContent(block.locales[language.code])}
                      onClick={() => switchLocale(language.code)}
                    />
                  ))}
                </div>
                <div className="content-editor-main">
                  <div className="content-editor-section-toolbar">
                    <Tabs
                      activeKey="content"
                      className="content-editor-section-tabs"
                      items={[{ key: 'content', label: '内容' }]}
                    />
                    <ContentTranslateButton
                      contentType="brandNarrativeBlock"
                      defaultLocale={defaultLocale}
                      activeLocale={activeLocale}
                      disabled={disabled || saving}
                      getDefaultSourceFields={getDefaultSourceFields}
                      hasDefaultPersisted={() => hasLocaleCopyContent(getDefaultBlockCopy())}
                      hasTargetContent={hasTargetLocaleContent}
                      onTranslated={handleTranslated}
                    />
                  </div>
                  <Form.Item name="smallTitle" label="小标题">
                    <Input />
                  </Form.Item>
                  <Form.Item name="largeTitle" label="大标题">
                    <Input />
                  </Form.Item>
                  <Form.Item name="description" label="描述">
                    <Input.TextArea rows={4} />
                  </Form.Item>
                  {block.type === 'cta' ? (
                    <Form.Item name="buttonLabel" label="导向按钮文案">
                      <Input />
                    </Form.Item>
                  ) : null}
                </div>
              </div>
            </Form>
          </Space>
        ) : null}
      </Modal>

      <BrandNarrativeBlockItemEditorModal
        ref={itemEditorRef}
        open={Boolean(editingItem)}
        mode={block?.type === 'summary' ? 'summary' : block?.type === 'timeline' ? 'timeline' : block?.type === 'course' ? 'course' : 'stub'}
        media={block && (block.type === 'timeline' || block.type === 'course' || summaryItemUsesCoverImage(block)) ? 'cover' : 'icon'}
        title={editingItemIndex >= 0 ? `编辑内容 · ${editingItemIndex + 1}` : '编辑内容'}
        item={editingItem}
        activeLanguages={activeLanguages}
        onChange={block?.type === 'summary' || block?.type === 'timeline' || block?.type === 'course' ? handleItemChange : undefined}
        onClose={() => setEditingItem(null)}
      />
    </>
  );
}
