'use client';

import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Drawer, Form, Input, Popconfirm, Space, Table, Tabs, Typography } from 'antd';
import { useEffect, useState } from 'react';

import { ContentEditorLocaleTab } from '@/components/admin/content-editor-locale-tab';
import { ContentTranslateButton } from '@/components/admin/content-translate-button';
import { AgendaItemModal } from '@/components/summits/agenda-item-modal';
import { applyNonemptyTranslatedFields } from '@/lib/content-translate-config';
import type { AgendaGroup, AgendaItem } from '@/lib/summit-content';
import type { AdminSiteLanguageRow } from '@/server/admin/languages';

type LocaleGroupDraft = { dayLabel: string; groupTitle: string };

type Props = {
  open: boolean;
  group: AgendaGroup | null;
  activeLanguages: AdminSiteLanguageRow[];
  onClose: () => void;
  onSave: (group: AgendaGroup) => void;
};

function emptyDraft(): LocaleGroupDraft {
  return { dayLabel: '', groupTitle: '' };
}

function draftFromGroup(group: AgendaGroup | null, locale: string, defaultLocale: string): LocaleGroupDraft {
  const copy = group?.locales?.[locale];
  if (copy) return { dayLabel: copy.dayLabel ?? '', groupTitle: copy.groupTitle ?? '' };
  if (locale === defaultLocale || !group?.locales) {
    return { dayLabel: group?.dayLabel ?? '', groupTitle: group?.groupTitle ?? '' };
  }
  return emptyDraft();
}

export function AgendaGroupDrawer({ open, group, activeLanguages, onClose, onSave }: Props) {
  const [localeForm] = Form.useForm<LocaleGroupDraft>();
  const [activeLocale, setActiveLocale] = useState(activeLanguages[0]?.code ?? 'zh');
  const [drafts, setDrafts] = useState<Record<string, LocaleGroupDraft>>({});
  const [items, setItems] = useState<AgendaItem[]>([]);
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AgendaItem | null>(null);
  const [itemLocale, setItemLocale] = useState(activeLanguages[0]?.code ?? 'zh');
  const [itemDrafts, setItemDrafts] = useState<Record<string, { title: string; desc: string; speaker: string }>>({});

  const defaultLocale = activeLanguages.find((language) => language.isDefault)?.code ?? activeLanguages[0]?.code ?? '';

  function getMergedDrafts() {
    return { ...drafts, [activeLocale]: localeForm.getFieldsValue(true) as LocaleGroupDraft };
  }

  useEffect(() => {
    if (!open) return;
    const first = activeLanguages.find((language) => language.isDefault)?.code ?? activeLanguages[0]?.code ?? 'zh';
    setActiveLocale(first);
    setItems(group?.items ?? []);
    const next: Record<string, LocaleGroupDraft> = {};
    for (const language of activeLanguages) {
      next[language.code] = draftFromGroup(group, language.code, first);
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
    return { dayLabel: draft.dayLabel, groupTitle: draft.groupTitle };
  }

  function hasTargetLocaleContent() {
    const draft = getMergedDrafts()[activeLocale] ?? emptyDraft();
    return Boolean(draft.dayLabel.trim() || draft.groupTitle.trim());
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
    const merged = getMergedDrafts();
    const primary = merged[defaultLocale] ?? merged[activeLocale] ?? emptyDraft();
    const locales: NonNullable<AgendaGroup['locales']> = {};
    for (const language of activeLanguages) {
      const draft = merged[language.code] ?? emptyDraft();
      if (draft.dayLabel.trim() || draft.groupTitle.trim()) {
        locales[language.code] = {
          dayLabel: draft.dayLabel.trim(),
          groupTitle: draft.groupTitle.trim(),
        };
      }
    }
    onSave({
      id: group?.id ?? crypto.randomUUID(),
      dayLabel: primary.dayLabel ?? '',
      groupTitle: primary.groupTitle ?? '',
      items,
      locales,
    });
  }

  function openItemEditor(item: AgendaItem | null) {
    setEditingItem(item);
    const first = defaultLocale || activeLanguages[0]?.code || 'zh';
    setItemLocale(first);
    const next: Record<string, { title: string; desc: string; speaker: string }> = {};
    for (const language of activeLanguages) {
      const copy = item?.locales?.[language.code];
      next[language.code] = copy
        ? { title: copy.title ?? '', desc: copy.desc ?? '', speaker: copy.speaker ?? '' }
        : language.code === first
          ? { title: item?.title ?? '', desc: item?.desc ?? '', speaker: item?.speaker ?? '' }
          : { title: '', desc: '', speaker: '' };
    }
    setItemDrafts(next);
    setItemModalOpen(true);
  }

  function handleItemSave(saved: AgendaItem) {
    setItems((prev) => {
      const exists = prev.some((row) => row.id === saved.id);
      return exists ? prev.map((row) => (row.id === saved.id ? saved : row)) : [...prev, saved];
    });
    setItemModalOpen(false);
    setEditingItem(null);
  }

  const columns = [
    {
      title: '时间', width: 130,
      render: (_: unknown, record: AgendaItem) => (
        <Typography.Text style={{ whiteSpace: 'nowrap' }}>{record.startTime} – {record.endTime}</Typography.Text>
      ),
    },
    { title: '标题', dataIndex: 'title', ellipsis: true },
    { title: '演讲人', dataIndex: 'speaker', width: 150, ellipsis: true },
    {
      title: '操作', width: 90,
      render: (_: unknown, record: AgendaItem) => (
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
        title={group ? `编辑议程分组 · ${group.dayLabel || group.id}` : '新建议程分组'}
        width={720}
        onClose={onClose}
        extra={<Button type="primary" onClick={handleSave}>保存分组</Button>}
        destroyOnClose
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Typography.Text strong>议程环节</Typography.Text>
              <Button icon={<PlusOutlined />} onClick={() => openItemEditor(null)}>添加议程环节</Button>
            </div>
            <Table
              rowKey="id"
              size="small"
              pagination={false}
              columns={columns}
              dataSource={items}
              locale={{ emptyText: '暂无议程环节' }}
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
                    persisted={Boolean(group?.locales?.[language.code] || (language.code === defaultLocale && group))}
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
                    contentType="summitAgendaGroup"
                    defaultLocale={defaultLocale}
                    activeLocale={activeLocale}
                    getDefaultSourceFields={getDefaultSourceFields}
                    hasDefaultPersisted={() => {
                      const draft = getMergedDrafts()[defaultLocale] ?? emptyDraft();
                      return Boolean(draft.dayLabel.trim() || draft.groupTitle.trim());
                    }}
                    hasTargetContent={hasTargetLocaleContent}
                    onTranslated={handleTranslated}
                  />
                </div>
                <Form.Item name="dayLabel" label="时间文案" extra='如 "DAY 1 · 12.10"'>
                  <Input placeholder="DAY 1 · 12.10" />
                </Form.Item>
                <Form.Item name="groupTitle" label="分组标题" extra='如 "开幕式与主题演讲"'>
                  <Input placeholder="开幕式与主题演讲" />
                </Form.Item>
              </div>
            </div>
          </Form>
        </Space>
      </Drawer>

      <AgendaItemModal
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
