'use client';

import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Drawer, Form, Input, Popconfirm, Space, Table, Typography } from 'antd';
import { useEffect, useState } from 'react';

import { ContentEditorLocaleTab } from '@/components/admin/content-editor-locale-tab';
import { AgendaItemModal } from '@/components/summits/agenda-item-modal';
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

export function AgendaGroupDrawer({ open, group, activeLanguages, onClose, onSave }: Props) {
  const [localeForm] = Form.useForm<LocaleGroupDraft>();
  const [activeLocale, setActiveLocale] = useState(activeLanguages[0]?.code ?? 'zh');
  const [drafts, setDrafts] = useState<Record<string, LocaleGroupDraft>>({});
  const [items, setItems] = useState<AgendaItem[]>([]);

  // Item modal state
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AgendaItem | null>(null);
  const [itemLocale, setItemLocale] = useState(activeLanguages[0]?.code ?? 'zh');
  const [itemDrafts, setItemDrafts] = useState<Record<string, { title: string; desc: string; speaker: string }>>({});

  useEffect(() => {
    if (!open) return;
    const first = activeLanguages[0]?.code ?? 'zh';
    setActiveLocale(first);
    setItems(group?.items ?? []);
    const d: Record<string, LocaleGroupDraft> = {};
    for (const l of activeLanguages) d[l.code] = { dayLabel: group?.dayLabel ?? '', groupTitle: group?.groupTitle ?? '' };
    setDrafts(d);
    localeForm.setFieldsValue(d[first] ?? emptyDraft());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function switchLocale(locale: string) {
    const cur = localeForm.getFieldsValue(true) as LocaleGroupDraft;
    setDrafts((d) => ({ ...d, [activeLocale]: cur }));
    setActiveLocale(locale);
    localeForm.setFieldsValue(drafts[locale] ?? emptyDraft());
  }

  function handleSave() {
    const cur = localeForm.getFieldsValue(true) as LocaleGroupDraft;
    const merged = { ...drafts, [activeLocale]: cur };
    const primary = merged[activeLanguages.find((l) => l.isDefault)?.code ?? activeLanguages[0]?.code ?? activeLocale] ?? cur;
    onSave({
      id: group?.id ?? crypto.randomUUID(),
      dayLabel: primary.dayLabel ?? '',
      groupTitle: primary.groupTitle ?? '',
      items,
    });
  }

  function openItemEditor(item: AgendaItem | null) {
    setEditingItem(item);
    const first = activeLanguages[0]?.code ?? 'zh';
    setItemLocale(first);
    const d: Record<string, { title: string; desc: string; speaker: string }> = {};
    for (const l of activeLanguages) d[l.code] = { title: item?.title ?? '', desc: item?.desc ?? '', speaker: item?.speaker ?? '' };
    setItemDrafts(d);
    setItemModalOpen(true);
  }

  function handleItemSave(saved: AgendaItem) {
    setItems((prev) => {
      const exists = prev.some((i) => i.id === saved.id);
      return exists ? prev.map((i) => (i.id === saved.id ? saved : i)) : [...prev, saved];
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
          <Popconfirm title="确定删除？" onConfirm={() => setItems((p) => p.filter((i) => i.id !== record.id))}>
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
          {/* 通用区：议程环节管理 */}
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

          {/* 多语言区：分组标题 */}
          <Form form={localeForm} layout="vertical" preserve>
            <div className="content-editor-layout">
              <div className="content-editor-locale-nav">
                {activeLanguages.map((l) => (
                  <ContentEditorLocaleTab
                    key={l.code}
                    language={l}
                    isActive={l.code === activeLocale}
                    persisted={Boolean(group)}
                    onClick={() => switchLocale(l.code)}
                  />
                ))}
              </div>
              <div className="content-editor-main">
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
