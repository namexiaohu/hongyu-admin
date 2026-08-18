'use client';

import { Form, Input, Modal, Space, Tabs } from 'antd';
import { useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react';

import { ContentTranslateButton } from '@/components/admin/content-translate-button';
import { ContentEditorLocaleTab } from '@/components/admin/content-editor-locale-tab';
import { BrandNarrativeSummaryIconPicker } from '@/components/brand-narratives/brand-narrative-summary-icons';
import { CoverImageField } from '@/components/editorial/cover-image-field';
import {
  createEmptyBlockLocaleCopy,
  defaultBrandNarrativeSummaryIcon,
  hasLocaleCopyContent,
  isSummaryIcon,
  writeLocaleCopy,
  type BrandNarrativeBlockItemDraft,
  type BrandNarrativeBlockLocaleCopy,
} from '@/lib/brand-narrative-blocks';
import { applyNonemptyTranslatedFields } from '@/lib/content-translate-config';
import type { AdminSiteLanguageRow } from '@/server/admin/languages';

type ItemEditorMode = 'summary' | 'timeline' | 'course' | 'stub';
type ItemEditorMedia = 'icon' | 'cover';

export type BrandNarrativeBlockItemEditorHandle = {
  flush: () => BrandNarrativeBlockItemDraft | null;
};

type BrandNarrativeBlockItemEditorModalProps = {
  open: boolean;
  mode?: ItemEditorMode;
  media?: ItemEditorMedia;
  title?: string;
  item: BrandNarrativeBlockItemDraft | null;
  activeLanguages: AdminSiteLanguageRow[];
  onChange?: (item: BrandNarrativeBlockItemDraft) => void;
  onClose: () => void;
  ref?: Ref<BrandNarrativeBlockItemEditorHandle>;
};

function readLocaleForm(values: BrandNarrativeBlockLocaleCopy): BrandNarrativeBlockLocaleCopy {
  return {
    smallTitle: values.smallTitle ?? '',
    largeTitle: values.largeTitle ?? '',
    description: values.description ?? '',
    badge: values.badge ?? '',
    totalHours: values.totalHours ?? '',
    teachingFormat: values.teachingFormat ?? '',
    trainingCycle: values.trainingCycle ?? '',
  };
}

export function BrandNarrativeBlockItemEditorModal({
  open,
  mode = 'stub',
  media = 'icon',
  title = '编辑内容',
  item,
  activeLanguages,
  onChange,
  onClose,
  ref,
}: BrandNarrativeBlockItemEditorModalProps) {
  const [form] = Form.useForm<BrandNarrativeBlockLocaleCopy>();
  const [activeLocale, setActiveLocale] = useState(activeLanguages[0]?.code ?? 'zh');
  const [sectionTab, setSectionTab] = useState<'content' | 'course'>('content');
  const hasLocaleFields = mode === 'summary' || mode === 'timeline' || mode === 'course';
  const itemRef = useRef<BrandNarrativeBlockItemDraft | null>(item);
  const defaultLocale = activeLanguages.find((language) => language.isDefault)?.code ?? activeLanguages[0]?.code ?? '';

  function currentItem() {
    return itemRef.current ?? item;
  }

  function getMergedItem(): BrandNarrativeBlockItemDraft | null {
    const source = currentItem();
    if (!source || !hasLocaleFields) return source;
    return mergeCurrentLocale(source);
  }

  function getDefaultItemCopy(): BrandNarrativeBlockLocaleCopy {
    const merged = getMergedItem();
    return merged?.locales?.[defaultLocale] ?? createEmptyBlockLocaleCopy();
  }

  function getActiveItemCopy(): BrandNarrativeBlockLocaleCopy {
    return readLocaleForm(form.getFieldsValue(true));
  }

  function getDefaultSourceFields(): Record<string, string> {
    const copy = getDefaultItemCopy();
    return {
      smallTitle: copy.smallTitle,
      largeTitle: copy.largeTitle,
      description: copy.description,
      badge: copy.badge ?? '',
      totalHours: copy.totalHours ?? '',
      teachingFormat: copy.teachingFormat ?? '',
      trainingCycle: copy.trainingCycle ?? '',
    };
  }

  function hasTargetLocaleContent() {
    return hasLocaleCopyContent(getActiveItemCopy());
  }

  function handleTranslated(fields: Record<string, string>) {
    const source = currentItem();
    if (!source || !hasLocaleFields) return;
    const nextCopy = applyNonemptyTranslatedFields(getActiveItemCopy(), fields);
    form.setFieldsValue(nextCopy);
    emit(mergeCurrentLocale(source));
  }

  useEffect(() => {
    if (!open) {
      itemRef.current = null;
      return;
    }
    itemRef.current = item;
    const firstLocale = activeLanguages[0]?.code ?? 'zh';
    setActiveLocale(firstLocale);
    setSectionTab('content');
    if (hasLocaleFields) {
      form.setFieldsValue(item?.locales?.[firstLocale] ?? createEmptyBlockLocaleCopy());
    }
    // 仅在打开或切换内容项时重置，避免把刚翻译的语言冲掉。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, item?.id, hasLocaleFields]);

  function emit(next: BrandNarrativeBlockItemDraft) {
    itemRef.current = next;
    onChange?.(next);
  }

  function mergeCurrentLocale(nextItem: BrandNarrativeBlockItemDraft) {
    if (!hasLocaleFields) return nextItem;
    return {
      ...nextItem,
      locales: writeLocaleCopy(
        nextItem.locales,
        activeLocale,
        readLocaleForm(form.getFieldsValue(true)),
      ),
    };
  }

  function switchLocale(locale: string) {
    const source = currentItem();
    if (!source || !hasLocaleFields) {
      setActiveLocale(locale);
      return;
    }
    const nextItem = mergeCurrentLocale(source);
    emit(nextItem);
    setActiveLocale(locale);
    form.setFieldsValue(nextItem.locales?.[locale] ?? createEmptyBlockLocaleCopy());
  }

  function flush(): BrandNarrativeBlockItemDraft | null {
    if (!open) return null;
    const source = currentItem();
    if (!source) return null;
    const next = hasLocaleFields ? mergeCurrentLocale(source) : source;
    emit(next);
    return next;
  }

  useImperativeHandle(ref, () => ({ flush }));

  function handleClose() {
    flush();
    onClose();
  }

  return (
    <Modal
      title={title}
      open={open}
      onCancel={handleClose}
      footer={null}
      width={880}
      destroyOnHidden
      className="content-editor-modal brand-editor-modal"
      rootClassName="content-editor-modal-wrap"
      style={{ top: 80 }}
      styles={{ body: { overflow: 'visible', minWidth: 0 } }}
    >
      <Space orientation="vertical" size="large" style={{ width: '100%', maxWidth: '100%', minWidth: 0 }}>
        <div className="content-editor-shared-section" style={mode === 'stub' && media !== 'cover' ? { minHeight: 72 } : undefined}>
          {media === 'icon' && mode === 'summary' && item ? (
            <BrandNarrativeSummaryIconPicker
              value={isSummaryIcon(item.icon) ? item.icon : defaultBrandNarrativeSummaryIcon}
              onChange={(icon) => emit(mergeCurrentLocale({ ...item, icon }))}
            />
          ) : null}
          {media === 'cover' && item ? (
            <CoverImageField
              folder="brand-narratives/covers"
              value={item.coverImage ?? ''}
              onChange={(next) => emit(mergeCurrentLocale({ ...item, coverImage: next ?? '' }))}
            />
          ) : null}
        </div>

        <div className="content-editor-layout">
          <div className="content-editor-locale-nav">
            {activeLanguages.map((language) => (
              <ContentEditorLocaleTab
                key={language.code}
                language={language}
                isActive={language.code === activeLocale}
                persisted={hasLocaleCopyContent(item?.locales?.[language.code])}
                onClick={() => switchLocale(language.code)}
              />
            ))}
          </div>
          <div className="content-editor-main">
            <div className="content-editor-section-toolbar">
              <Tabs
                activeKey={sectionTab}
                className="content-editor-section-tabs"
                onChange={(key) => setSectionTab(key as 'content' | 'course')}
                items={mode === 'course'
                  ? [
                    { key: 'content', label: '内容' },
                    { key: 'course', label: '课程配置' },
                  ]
                  : [{ key: 'content', label: '内容' }]}
              />
              {hasLocaleFields ? (
                <ContentTranslateButton
                  contentType="brandNarrativeBlockItem"
                  defaultLocale={defaultLocale}
                  activeLocale={activeLocale}
                  getDefaultSourceFields={getDefaultSourceFields}
                  hasDefaultPersisted={() => hasLocaleCopyContent(getDefaultItemCopy())}
                  hasTargetContent={hasTargetLocaleContent}
                  onTranslated={handleTranslated}
                />
              ) : null}
            </div>
            {hasLocaleFields ? (
              <Form form={form} layout="vertical" preserve>
                <div style={{ display: sectionTab === 'content' ? 'block' : 'none' }}>
                  <Form.Item name="smallTitle" label={mode === 'course' ? '标题' : '小标题'}>
                    <Input />
                  </Form.Item>
                  <Form.Item name="largeTitle" label="大标题">
                    <Input />
                  </Form.Item>
                  <Form.Item name="description" label="描述">
                    <Input.TextArea rows={4} />
                  </Form.Item>
                  {mode === 'course' ? (
                    <Form.Item name="badge" label="角标文案">
                      <Input />
                    </Form.Item>
                  ) : null}
                </div>
                {mode === 'course' ? (
                  <div style={{ display: sectionTab === 'course' ? 'block' : 'none' }}>
                    <Form.Item name="totalHours" label="总课时">
                      <Input />
                    </Form.Item>
                    <Form.Item name="teachingFormat" label="教学形式">
                      <Input />
                    </Form.Item>
                    <Form.Item name="trainingCycle" label="培训周期">
                      <Input />
                    </Form.Item>
                  </div>
                ) : null}
              </Form>
            ) : null}
          </div>
        </div>
      </Space>
    </Modal>
  );
}
