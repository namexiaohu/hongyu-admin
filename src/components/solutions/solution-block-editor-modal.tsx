'use client';

import { Button, Form, Input, Modal, Select, Space, Tabs, Tooltip, Typography } from 'antd';
import { useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react';

import { ContentTranslateButton } from '@/components/admin/content-translate-button';
import { ContentEditorLocaleTab } from '@/components/admin/content-editor-locale-tab';
import { ProductPickerField } from '@/components/products/product-picker-field';
import { SolutionBlockItemEditorModal, type SolutionBlockItemEditorHandle } from '@/components/solutions/solution-block-item-editor-modal';
import { SolutionBlockItemList } from '@/components/solutions/solution-block-item-list';
import { ProductGalleryField } from '@/components/products/product-gallery-field';
import { ProductVideoField } from '@/components/products/product-video-field';
import { HeroBackgroundFitField } from '@/components/shared/hero-background-fit-field';
import { HeroCopyStyleField } from '@/components/shared/hero-copy-style-field';
import type { AdminCategoryTreeNode } from '@/lib/category-content';
import type { ProductGalleryImage } from '@/lib/product-content';
import {
  solutionSplitLayoutLabels,
  solutionSplitLayouts,
  solutionSummaryLayoutLabels,
  solutionSummaryLayouts,
  createSolutionCarouselSlide,
  createEmptyBlockLocaleCopy,
  getSolutionBlockLabel,
  hasLocaleCopyContent,
  isSplitLayout,
  isSummaryLayout,
  summaryItemUsesCoverImage,
  writeLocaleCopy,
  type SolutionBlockDraft,
  type SolutionBlockItemDraft,
  type SolutionBlockLocaleCopy,
  type SolutionSplitLayout,
  type SolutionSummaryLayout,
} from '@/lib/solution-blocks';
import { applyNonemptyTranslatedFields } from '@/lib/content-translate-config';
import { defaultHeroBackgroundFitMode, type HeroBackgroundFitMode } from '@/lib/hero-background-fit';
import { defaultAdminHeroCopyStyle, type HeroCopyStyle } from '@/lib/hero-copy-style';
import type { AdminSiteLanguageRow } from '@/server/admin/languages';

export type SolutionBlockEditorHandle = {
  flush: () => SolutionBlockDraft | null;
};

type SolutionBlockEditorModalProps = {
  open: boolean;
  block: SolutionBlockDraft | null;
  activeLanguages: AdminSiteLanguageRow[];
  categoryTree: AdminCategoryTreeNode[];
  disabled?: boolean;
  saving?: boolean;
  onChange: (block: SolutionBlockDraft) => void;
  onSave: (block: SolutionBlockDraft) => void;
  onClose: () => void;
  ref?: Ref<SolutionBlockEditorHandle>;
};

function readLocaleForm(values: SolutionBlockLocaleCopy): SolutionBlockLocaleCopy {
  return {
    smallTitle: values.smallTitle ?? '',
    largeTitle: values.largeTitle ?? '',
    description: values.description ?? '',
    buttonLabel: values.buttonLabel ?? '',
  };
}

export function SolutionBlockEditorModal({
  open,
  block,
  activeLanguages,
  categoryTree,
  disabled = false,
  saving = false,
  onChange,
  onSave,
  onClose,
  ref,
}: SolutionBlockEditorModalProps) {
  const [form] = Form.useForm<SolutionBlockLocaleCopy>();
  const [activeLocale, setActiveLocale] = useState(activeLanguages[0]?.code ?? 'zh');
  const [editingItem, setEditingItem] = useState<SolutionBlockItemDraft | null>(null);
  const blockRef = useRef<SolutionBlockDraft | null>(block);
  const itemEditorRef = useRef<SolutionBlockItemEditorHandle>(null);
  const defaultLocale = activeLanguages.find((language) => language.isDefault)?.code ?? activeLanguages[0]?.code ?? '';

  function currentBlock() {
    return blockRef.current ?? block;
  }

  function getMergedBlock(): SolutionBlockDraft | null {
    const source = currentBlock();
    if (!source) return null;
    return mergeCurrentLocale(source);
  }

  function getDefaultBlockCopy(): SolutionBlockLocaleCopy {
    const merged = getMergedBlock();
    return merged?.locales[defaultLocale] ?? createEmptyBlockLocaleCopy();
  }

  function getActiveBlockCopy(): SolutionBlockLocaleCopy {
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

  function emit(next: SolutionBlockDraft) {
    blockRef.current = next;
    onChange(next);
  }

  function mergeCurrentLocale(nextBlock: SolutionBlockDraft) {
    return {
      ...nextBlock,
      locales: writeLocaleCopy(
        nextBlock.locales,
        activeLocale,
        readLocaleForm(form.getFieldsValue(true)),
      ),
    };
  }

  function patchShared(patch: Partial<SolutionBlockDraft>) {
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

  function flush(): SolutionBlockDraft | null {
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

  function handleItemChange(next: SolutionBlockItemDraft) {
    const source = currentBlock();
    if (!source) return;
    setEditingItem(next);
    patchShared({
      items: source.items.map((item) => (item.id === next.id ? next : item)),
    });
  }

  const showItemList = block?.type === 'summary' || block?.type === 'timeline' || block?.type === 'course';
  const itemLabel = block?.type === 'timeline' ? '节点' : block?.type === 'course' ? '课程' : '内容';
  const editingItemIndex = editingItem
    ? (block?.items.findIndex((item) => item.id === editingItem.id) ?? -1)
    : -1;

  return (
    <>
      <Modal
        title={block ? `编辑区块 · ${getSolutionBlockLabel(block)}` : '编辑区块'}
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
                        options={solutionSplitLayouts.map((layout) => ({
                          value: layout,
                          label: solutionSplitLayoutLabels[layout],
                        }))}
                        onChange={(layout: SolutionSplitLayout) => patchShared({ layout })}
                      />
                    </div>
                    <div>
                      <div style={{ marginBottom: 8 }}>看板文案风格</div>
                      <HeroCopyStyleField
                        value={block.heroCopyStyle ?? defaultAdminHeroCopyStyle()}
                        onChange={(value: HeroCopyStyle) => patchShared({ heroCopyStyle: value })}
                        disabled={disabled}
                      />
                    </div>
                    <div>
                      <div style={{ marginBottom: 8 }}>轮播图显示效果</div>
                      <HeroBackgroundFitField
                        value={block.carouselFitMode ?? defaultHeroBackgroundFitMode()}
                        onChange={(value: HeroBackgroundFitMode) => patchShared({ carouselFitMode: value })}
                        disabled={disabled}
                      />
                    </div>
                    <div>
                      <div style={{ marginBottom: 8 }}>轮播图</div>
                      <ProductGalleryField
                        folder="solutions/gallery"
                        value={(block.carouselImages ?? []).map((slide) => ({
                          url: slide.url,
                          alt: '',
                          width: null,
                          height: null,
                        }))}
                        onChange={(gallery: ProductGalleryImage[]) => {
                          const previous = block.carouselImages ?? [];
                          const usedIds = new Set<string>();
                          patchShared({
                            carouselImages: gallery
                              .filter((item) => item.url.trim())
                              .map((item) => {
                                const match = previous.find((slide) => slide.url === item.url && !usedIds.has(slide.id));
                                if (match) {
                                  usedIds.add(match.id);
                                  return match;
                                }
                                return createSolutionCarouselSlide(item.url);
                              }),
                          });
                        }}
                      />
                    </div>
                    <div>
                      <div style={{ marginBottom: 8 }}>视频</div>
                      <ProductVideoField
                        folder="solutions/videos"
                        value={block.videoUrl || null}
                        onChange={(value) => patchShared({ videoUrl: value ?? '' })}
                      />
                    </div>
                  </>
                ) : null}

                {block.type === 'summary' ? (
                  <div>
                    <div style={{ marginBottom: 8 }}>布局风格</div>
                    <Select
                      style={{ width: '100%' }}
                      value={isSummaryLayout(block.layout) ? block.layout : 'single-row'}
                      options={solutionSummaryLayouts.map((layout) => ({
                        value: layout,
                        label: solutionSummaryLayoutLabels[layout],
                      }))}
                      onChange={(layout: SolutionSummaryLayout) => patchShared({ layout })}
                    />
                  </div>
                ) : null}

                {block.type === 'specifications' ? (
                  <Typography.Text type="secondary">
                    产品参数表格行来自多语言区「产品参数」标签页；此处仅配置区块标题。
                  </Typography.Text>
                ) : null}

                {block.type === 'relatedProducts' ? (
                  <div>
                    <div style={{ marginBottom: 8 }}>指定商品</div>
                    <ProductPickerField
                      mode="multiple"
                      categoryTree={categoryTree}
                      value={block.productIds ?? []}
                      onChange={(productIds) => patchShared({ productIds })}
                      addButtonLabel="添加商品"
                    />
                  </div>
                ) : null}

                {showItemList ? (
                  <SolutionBlockItemList
                    items={block.items}
                    itemLabel={itemLabel}
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
                      contentType="solutionBlock"
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
                  <Form.Item name="largeTitle" label="标题">
                    <Input />
                  </Form.Item>
                  <Form.Item name="description" label="描述">
                    <Input.TextArea rows={4} />
                  </Form.Item>
                </div>
              </div>
            </Form>
          </Space>
        ) : null}
      </Modal>

      <SolutionBlockItemEditorModal
        ref={itemEditorRef}
        open={Boolean(editingItem)}
        mode={block?.type === 'summary' ? 'summary' : block?.type === 'timeline' ? 'timeline' : block?.type === 'course' ? 'course' : 'stub'}
        media={block && (block.type === 'timeline' || block.type === 'course' || summaryItemUsesCoverImage(block)) ? 'cover' : 'icon'}
        title={editingItemIndex >= 0 ? `编辑${itemLabel} · ${editingItemIndex + 1}` : `编辑${itemLabel}`}
        item={editingItem}
        activeLanguages={activeLanguages}
        onChange={block?.type === 'summary' || block?.type === 'timeline' || block?.type === 'course' ? handleItemChange : undefined}
        onClose={() => setEditingItem(null)}
      />
    </>
  );
}
