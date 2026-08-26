'use client';

import { Button, Form, Input, Modal, Tabs } from 'antd';
import { useEffect, useTransition } from 'react';

import { ContentEditorLocaleTab } from '@/components/admin/content-editor-locale-tab';
import { ContentTranslateButton } from '@/components/admin/content-translate-button';
import { applyNonemptyTranslatedFields } from '@/lib/content-translate-config';
import { createNavId, hasNavLocaleContent, type NavItem } from '@/lib/website-config';
import type { AdminSiteLanguageRow } from '@/server/admin/languages';

type LocaleItemDraft = { name: string };
type SharedValues = { href: string };

type Props = {
  open: boolean;
  item: NavItem | null;
  activeLanguages: AdminSiteLanguageRow[];
  activeLocale: string;
  onLocaleChange: (locale: string) => void;
  drafts: Record<string, LocaleItemDraft>;
  onDraftsChange: (d: Record<string, LocaleItemDraft>) => void;
  onClose: () => void;
  onSave: (item: NavItem) => void;
};

function emptyDraft(): LocaleItemDraft {
  return { name: '' };
}

export function NavItemModal({
  open,
  item,
  activeLanguages,
  activeLocale,
  onLocaleChange,
  drafts,
  onDraftsChange,
  onClose,
  onSave,
}: Props) {
  const [sharedForm] = Form.useForm<SharedValues>();
  const [localeForm] = Form.useForm<LocaleItemDraft>();
  const [isPending, startTransition] = useTransition();
  const defaultLocale = activeLanguages.find((language) => language.isDefault)?.code ?? activeLanguages[0]?.code ?? '';

  function getMergedDrafts() {
    return { ...drafts, [activeLocale]: localeForm.getFieldsValue(true) as LocaleItemDraft };
  }

  useEffect(() => {
    if (!open) return;
    sharedForm.setFieldsValue({ href: item?.href ?? '' });
    localeForm.setFieldsValue(drafts[activeLocale] ?? emptyDraft());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    localeForm.setFieldsValue(drafts[activeLocale] ?? emptyDraft());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLocale]);

  function switchLocale(locale: string) {
    const merged = getMergedDrafts();
    onDraftsChange(merged);
    onLocaleChange(locale);
    localeForm.setFieldsValue(merged[locale] ?? emptyDraft());
  }

  function getDefaultSourceFields(): Record<string, string> {
    const draft = getMergedDrafts()[defaultLocale] ?? emptyDraft();
    return { name: draft.name };
  }

  function hasTargetLocaleContent() {
    const draft = getMergedDrafts()[activeLocale] ?? emptyDraft();
    return Boolean(draft.name.trim());
  }

  function handleTranslated(fields: Record<string, string>) {
    const merged = getMergedDrafts();
    const current = merged[activeLocale] ?? emptyDraft();
    const nextDraft = applyNonemptyTranslatedFields(current, fields);
    const nextDrafts = { ...merged, [activeLocale]: nextDraft };
    onDraftsChange(nextDrafts);
    localeForm.setFieldsValue(nextDraft);
  }

  function handleSave() {
    startTransition(() => {
      const shared = sharedForm.getFieldsValue(true) as SharedValues;
      const merged = getMergedDrafts();
      onDraftsChange(merged);
      const primaryDraft = merged[defaultLocale] ?? merged[activeLocale] ?? emptyDraft();
      const locales: NonNullable<NavItem['locales']> = {};
      for (const language of activeLanguages) {
        const draft = merged[language.code] ?? emptyDraft();
        if (draft.name.trim()) {
          locales[language.code] = { name: draft.name.trim() };
        }
      }

      onSave({
        id: item?.id ?? createNavId('nav-item'),
        href: shared.href?.trim() ?? '',
        name: primaryDraft.name?.trim() ?? '',
        locales,
      });
    });
  }

  return (
    <Modal
      open={open}
      title={item ? '编辑导航条目' : '添加导航条目'}
      width={640}
      onCancel={onClose}
      footer={null}
      destroyOnHidden
      style={{ top: 80 }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button type="primary" loading={isPending} onClick={handleSave}>保存</Button>
        </div>

        <div className="content-editor-shared-section">
          <Form form={sharedForm} layout="vertical">
            <Form.Item name="href" label="链接" rules={[{ required: true, message: '请输入链接' }]}>
              <Input placeholder="/about 或 https://..." />
            </Form.Item>
          </Form>
        </div>

        <Form form={localeForm} layout="vertical" preserve>
          <div className="content-editor-layout">
            <div className="content-editor-locale-nav">
              {activeLanguages.map((language) => (
                <ContentEditorLocaleTab
                  key={language.code}
                  language={language}
                  isActive={language.code === activeLocale}
                  persisted={hasNavLocaleContent(item, language.code, defaultLocale)}
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
                  contentType="websiteNavItem"
                  defaultLocale={defaultLocale}
                  activeLocale={activeLocale}
                  disabled={isPending}
                  getDefaultSourceFields={getDefaultSourceFields}
                  hasDefaultPersisted={() => {
                    const draft = getMergedDrafts()[defaultLocale] ?? emptyDraft();
                    return Boolean(draft.name.trim());
                  }}
                  hasTargetContent={hasTargetLocaleContent}
                  onTranslated={handleTranslated}
                />
              </div>
              <Form.Item name="name" label="标题" rules={[{ required: true, message: '请输入标题' }]}>
                <Input placeholder="企业介绍" />
              </Form.Item>
            </div>
          </div>
        </Form>
      </div>
    </Modal>
  );
}
