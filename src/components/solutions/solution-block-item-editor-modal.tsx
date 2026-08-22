'use client';

import { Form, Input, Modal, Space, Tabs } from 'antd';
import { useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react';

import { ContentTranslateButton } from '@/components/admin/content-translate-button';
import { ContentEditorLocaleTab } from '@/components/admin/content-editor-locale-tab';
import { SolutionSummaryIconPicker } from '@/components/solutions/solution-summary-icons';
import { CoverOptionField } from '@/components/shared/cover-option-field';
import {
  createEmptyBlockLocaleCopy,
  hasLocaleCopyContent,
  isSummaryIcon,
  writeLocaleCopy,
  type SolutionBlockItemDraft,
  type SolutionBlockLocaleCopy,
} from '@/lib/solution-blocks';
import { applyNonemptyTranslatedFields } from '@/lib/content-translate-config';
import type { AdminSiteLanguageRow } from '@/server/admin/languages';

type ItemEditorMode = 'summary' | 'timeline' | 'course' | 'stub';
type ItemEditorMedia = 'icon' | 'cover';

export type SolutionBlockItemEditorHandle = {
  flush: () => SolutionBlockItemDraft | null;
};

type SolutionBlockItemEditorModalProps = {
  open: boolean;
  mode?: ItemEditorMode;
  media?: ItemEditorMedia;
  title?: string;
  item: SolutionBlockItemDraft | null;
  activeLanguages: AdminSiteLanguageRow[];
  onChange?: (item: SolutionBlockItemDraft) => void;
  onClose: () => void;
  ref?: Ref<SolutionBlockItemEditorHandle>;
};

function readLocaleForm(values: SolutionBlockLocaleCopy): SolutionBlockLocaleCopy {
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

export function SolutionBlockItemEditorModal({
  open,
  mode = 'stub',
  media = 'icon',
  title = '编辑内容',
  item,
  activeLanguages,
  onChange,
  onClose,
  ref,
}: SolutionBlockItemEditorModalProps) {
  const [form] = Form.useForm<SolutionBlockLocaleCopy>();
  const [activeLocale, setActiveLocale] = useState(activeLanguages[0]?.code ?? 'zh');
  const [sectionTab, setSectionTab] = useState<'content' | 'course'>('content');
  const hasLocaleFields = mode === 'summary' || mode === 'timeline' || mode === 'course';
  const itemRef = useRef<SolutionBlockItemDraft | null>(item);
  const defaultLocale = activeLanguages.find((language) => language.isDefault)?.code ?? activeLanguages[0]?.code ?? '';

  function currentItem() {
    return itemRef.current ?? item;
  }

  function getMergedItem(): SolutionBlockItemDraft | null {
    const source = currentItem();
    if (!source || !hasLocaleFields) return source;
    return mergeCurrentLocale(source);
  }

  function getDefaultItemCopy(): SolutionBlockLocaleCopy {
    const merged = getMergedItem();
    return merged?.locales?.[defaultLocale] ?? createEmptyBlockLocaleCopy();
  }

  function getActiveItemCopy(): SolutionBlockLocaleCopy {
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

  function emit(next: SolutionBlockItemDraft) {
    itemRef.current = next;
    onChange?.(next);
  }

  function mergeCurrentLocale(nextItem: SolutionBlockItemDraft) {
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

  function flush(): SolutionBlockItemDraft | null {
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
          <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
            {mode === 'summary' && item ? (
              <SolutionSummaryIconPicker
                value={isSummaryIcon(item.icon) ? item.icon : null}
                onChange={(icon) => {
                  const next = { ...item };
                  if (icon) next.icon = icon;
                  else delete next.icon;
                  emit(mergeCurrentLocale(next));
                }}
              />
            ) : null}
            {media === 'cover' && item ? (
              <CoverOptionField
                value={{
                  mode: item.coverMode ?? '',
                  value: item.coverValue ?? '',
                  previewUrl: item.coverPreviewUrl ?? '',
                }}
                onChange={(next) =>
                  emit(
                    mergeCurrentLocale({
                      ...item,
                      coverMode: next.mode,
                      coverValue: next.value,
                      coverPreviewUrl: next.previewUrl ?? '',
                      coverImage: next.mode === 'upload' ? (item.coverImage ?? '') : '',
                    }),
                  )
                }
              />
            ) : null}
          </Space>
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
                  contentType="solutionBlockItem"
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
                  <Form.Item name="smallTitle" label="小标题">
                    <Input />
                  </Form.Item>
                  <Form.Item name="largeTitle" label="标题">
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
