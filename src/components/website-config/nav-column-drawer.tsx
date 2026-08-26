'use client';

import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Drawer, Form, Input, Popconfirm, Space, Table, Tabs, Typography } from 'antd';
import { useEffect, useState } from 'react';

import { ContentEditorLocaleTab } from '@/components/admin/content-editor-locale-tab';
import { ContentTranslateButton } from '@/components/admin/content-translate-button';
import { NavItemModal } from '@/components/website-config/nav-item-modal';
import { applyNonemptyTranslatedFields } from '@/lib/content-translate-config';
import { createNavId, type NavColumn, type NavItem } from '@/lib/website-config';
import type { AdminSiteLanguageRow } from '@/server/admin/languages';

type LocaleColumnDraft = { name: string };
type SharedValues = { href: string };

type Props = {
  open: boolean;
  column: NavColumn | null;
  activeLanguages: AdminSiteLanguageRow[];
  onClose: () => void;
  onSave: (column: NavColumn) => void;
};

function emptyDraft(): LocaleColumnDraft {
  return { name: '' };
}

function draftFromColumn(column: NavColumn | null, locale: string, defaultLocale: string): LocaleColumnDraft {
  const copy = column?.locales?.[locale];
  if (copy) return { name: copy.name ?? '' };
  if (locale === defaultLocale || !column?.locales) {
    return { name: column?.name ?? '' };
  }
  return emptyDraft();
}

export function NavColumnDrawer({ open, column, activeLanguages, onClose, onSave }: Props) {
  const [sharedForm] = Form.useForm<SharedValues>();
  const [localeForm] = Form.useForm<LocaleColumnDraft>();
  const [activeLocale, setActiveLocale] = useState(activeLanguages[0]?.code ?? 'zh');
  const [drafts, setDrafts] = useState<Record<string, LocaleColumnDraft>>({});
  const [items, setItems] = useState<NavItem[]>([]);
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<NavItem | null>(null);
  const [itemLocale, setItemLocale] = useState(activeLanguages[0]?.code ?? 'zh');
  const [itemDrafts, setItemDrafts] = useState<Record<string, { name: string }>>({});

  const defaultLocale = activeLanguages.find((language) => language.isDefault)?.code ?? activeLanguages[0]?.code ?? '';

  function getMergedDrafts() {
    return { ...drafts, [activeLocale]: localeForm.getFieldsValue(true) as LocaleColumnDraft };
  }

  useEffect(() => {
    if (!open) return;
    const first = activeLanguages.find((language) => language.isDefault)?.code ?? activeLanguages[0]?.code ?? 'zh';
    setActiveLocale(first);
    setItems(column?.items ?? []);
    sharedForm.setFieldsValue({ href: column?.href ?? '' });
    const next: Record<string, LocaleColumnDraft> = {};
    for (const language of activeLanguages) {
      next[language.code] = draftFromColumn(column, language.code, first);
    }
    setDrafts(next);
    localeForm.setFieldsValue(next[first] ?? emptyDraft());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function switchLocale(locale: string) {
    const merged = getMergedDrafts();
    setDrafts(merged);
    setActiveLocale(locale);
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
    setDrafts(nextDrafts);
    localeForm.setFieldsValue(nextDraft);
  }

  function handleSave() {
    const shared = sharedForm.getFieldsValue(true) as SharedValues;
    const merged = getMergedDrafts();
    const primary = merged[defaultLocale] ?? merged[activeLocale] ?? emptyDraft();
    const locales: NonNullable<NavColumn['locales']> = {};
    for (const language of activeLanguages) {
      const draft = merged[language.code] ?? emptyDraft();
      if (draft.name.trim()) {
        locales[language.code] = { name: draft.name.trim() };
      }
    }
    const href = shared.href?.trim() ?? '';
    onSave({
      id: column?.id ?? createNavId('nav-column'),
      href,
      name: primary.name ?? '',
      items,
      locales,
    });
  }

  function openItemEditor(item: NavItem | null) {
    setEditingItem(item);
    const first = defaultLocale || activeLanguages[0]?.code || 'zh';
    setItemLocale(first);
    const next: Record<string, { name: string }> = {};
    for (const language of activeLanguages) {
      const copy = item?.locales?.[language.code];
      next[language.code] = copy
        ? { name: copy.name ?? '' }
        : language.code === first
          ? { name: item?.name ?? '' }
          : { name: '' };
    }
    setItemDrafts(next);
    setItemModalOpen(true);
  }

  function handleItemSave(saved: NavItem) {
    setItems((prev) => {
      const exists = prev.some((row) => row.id === saved.id);
      return exists ? prev.map((row) => (row.id === saved.id ? saved : row)) : [...prev, saved];
    });
    setItemModalOpen(false);
    setEditingItem(null);
  }

  const columns = [
    { title: '标题', dataIndex: 'name', ellipsis: true },
    { title: '链接', dataIndex: 'href', ellipsis: true },
    {
      title: '操作',
      width: 90,
      render: (_: unknown, record: NavItem) => (
        <Space size={0}>
          <Button type="text" icon={<EditOutlined />} onClick={() => openItemEditor(record)} />
          <Popconfirm title="确定删除？" onConfirm={() => setItems((prev) => prev.filter((row) => row.id !== record.id))}>
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Drawer
        open={open}
        title={column ? `编辑导航栏目 · ${column.name || column.id}` : '添加导航栏目'}
        width={720}
        onClose={onClose}
        extra={<Button type="primary" onClick={handleSave}>保存栏目</Button>}
        destroyOnClose
      >
        <Space orientation="vertical" size="large" style={{ width: '100%' }}>
          <div className="content-editor-shared-section">
            <Form form={sharedForm} layout="vertical">
              <Form.Item
                name="href"
                label="链接"
                extra="选填。填写后一级菜单可直接跳转；可不配置下级导航条目。"
              >
                <Input placeholder="/solutions 或 https://..." allowClear />
              </Form.Item>
            </Form>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Typography.Text strong>导航条目</Typography.Text>
              <Button icon={<PlusOutlined />} onClick={() => openItemEditor(null)}>添加导航条目</Button>
            </div>
            <Table
              rowKey="id"
              size="small"
              pagination={false}
              columns={columns}
              dataSource={items}
              locale={{ emptyText: '暂无导航条目（可仅配置一级链接）' }}
            />
          </div>

          <Form form={localeForm} layout="vertical" preserve>
            <div className="content-editor-layout">
              <div className="content-editor-locale-nav">
                {activeLanguages.map((language) => (
                  <ContentEditorLocaleTab
                    key={language.code}
                    language={language}
                    isActive={language.code === activeLocale}
                    persisted={Boolean(column?.locales?.[language.code] || (language.code === defaultLocale && column))}
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
                    contentType="websiteNavColumn"
                    defaultLocale={defaultLocale}
                    activeLocale={activeLocale}
                    getDefaultSourceFields={getDefaultSourceFields}
                    hasDefaultPersisted={() => {
                      const draft = getMergedDrafts()[defaultLocale] ?? emptyDraft();
                      return Boolean(draft.name.trim());
                    }}
                    hasTargetContent={hasTargetLocaleContent}
                    onTranslated={handleTranslated}
                  />
                </div>
                <Form.Item name="name" label="标题" rules={[{ required: true, message: '请输入栏目标题' }]}>
                  <Input placeholder="解决方案" />
                </Form.Item>
              </div>
            </div>
          </Form>
        </Space>
      </Drawer>

      <NavItemModal
        open={itemModalOpen}
        item={editingItem}
        activeLanguages={activeLanguages}
        activeLocale={itemLocale}
        onLocaleChange={setItemLocale}
        drafts={itemDrafts}
        onDraftsChange={setItemDrafts}
        onClose={() => { setItemModalOpen(false); setEditingItem(null); }}
        onSave={handleItemSave}
      />
    </>
  );
}
