'use client';

import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, DatePicker, Form, Input, Modal, Popconfirm, Select, Space, Table, Tabs, Typography, message } from 'antd';
import dayjs from 'dayjs';
import { useEffect, useState, useTransition } from 'react';

import { ContentEditorLocaleTab } from '@/components/admin/content-editor-locale-tab';
import { ContentTranslateButton } from '@/components/admin/content-translate-button';
import { CoverImageField } from '@/components/editorial/cover-image-field';
import {
  CoverOptionField,
  type CoverOptionValue,
} from '@/components/shared/cover-option-field';
import { applyNonemptyTranslatedFields } from '@/lib/content-translate-config';
import { deserializeSpeakers, serializeSpeakers } from '@/lib/content-translate-serialize';
import { AgendaGroupDrawer } from '@/components/summits/agenda-group-drawer';
import {
  type AdminSummitDetail,
  type AdminSummitTranslation,
  type AgendaGroup,
  type SpeakerItem,
  summitStatuses,
  summitStatusLabels,
} from '@/lib/summit-content';
import { shouldPersistLocaleDraft } from '@/lib/locale-draft-persistence';
import { resolveSlugForSave, textToSlug, validateSourceThenAutoSlug } from '@/lib/slug';
import type { AdminSiteLanguageRow } from '@/server/admin/languages';

type SectionTabKey = 'content' | 'speakers' | 'venue';

type LocaleDraft = {
  title: string;
  description: string;
  scale: string;
  duration: string;
  location: string;
  address: string;
  transportation: string;
  speakers: SpeakerItem[];
};

type SharedFormValues = {
  slug: string;
  status: string;
  startDate: dayjs.Dayjs | null;
  endDate: dayjs.Dayjs | null;
  cover: CoverOptionValue;
  venueImage: string;
};

type Props = {
  open: boolean;
  detail: AdminSummitDetail | null;
  activeLanguages: AdminSiteLanguageRow[];
  onClose: () => void;
  onSaved: (detail: AdminSummitDetail) => void;
};

function emptyDraft(): LocaleDraft {
  return { title: '', description: '', scale: '', duration: '', location: '', address: '', transportation: '', speakers: [] };
}

function translationToDraft(t: AdminSummitTranslation): LocaleDraft {
  return { title: t.title, description: t.description, scale: t.scale, duration: t.duration, location: t.location, address: t.address, transportation: t.transportation, speakers: (t.speakers ?? []) as SpeakerItem[] };
}

function buildDrafts(detail: AdminSummitDetail | null, languages: AdminSiteLanguageRow[]): Record<string, LocaleDraft> {
  const d: Record<string, LocaleDraft> = {};
  for (const l of languages) {
    const t = detail?.translations.find((i) => i.locale === l.code);
    d[l.code] = t ? translationToDraft(t) : emptyDraft();
  }
  return d;
}

function hasDraftContent(d: LocaleDraft): boolean {
  return Boolean(d.title.trim() || d.description.trim() || d.location.trim());
}

function buildTranslationBody(d: LocaleDraft, locale: string) {
  return {
    locale,
    title: d.title.trim(),
    description: d.description.trim(),
    scale: d.scale.trim(),
    duration: d.duration.trim(),
    location: d.location.trim(),
    address: d.address.trim(),
    transportation: d.transportation.trim(),
    speakers: d.speakers.map((s) => ({ ...s, name: s.name.trim(), bio: s.bio.trim(), expertise: s.expertise.trim() })),
  };
}

const statusOptions = summitStatuses.map((v) => ({ value: v, label: summitStatusLabels[v] }));

export function SummitEditorModal({ open, detail, activeLanguages, onClose, onSaved }: Props) {
  const [sharedForm] = Form.useForm<SharedFormValues>();
  const [localeForm] = Form.useForm<LocaleDraft>();
  const [activeLocale, setActiveLocale] = useState(activeLanguages[0]?.code ?? 'zh');
  const [sectionTab, setSectionTab] = useState<SectionTabKey>('content');
  const [drafts, setDrafts] = useState<Record<string, LocaleDraft>>({});
  const [agenda, setAgenda] = useState<AgendaGroup[]>([]);
  const [groupDrawerOpen, setGroupDrawerOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<AgendaGroup | null>(null);
  const [isPending, startTransition] = useTransition();
  const isCreate = !detail;
  const defaultLocale = activeLanguages.find((l) => l.isDefault)?.code ?? activeLanguages[0]?.code ?? '';

  function getMergedDrafts() {
    return { ...drafts, [activeLocale]: localeForm.getFieldsValue(true) as LocaleDraft };
  }

  function getDefaultSourceFields(): Record<string, string> {
    const draft = getMergedDrafts()[defaultLocale] ?? emptyDraft();
    return {
      title: draft.title,
      description: draft.description,
      scale: draft.scale,
      duration: draft.duration,
      location: draft.location,
      address: draft.address,
      transportation: draft.transportation,
      speakersText: serializeSpeakers(draft.speakers),
    };
  }

  function hasTargetLocaleContent() {
    const draft = getMergedDrafts()[activeLocale] ?? emptyDraft();
    return hasDraftContent(draft) || draft.speakers.some((speaker) => speaker.name?.trim() || speaker.bio?.trim() || speaker.expertise?.trim());
  }

  function handleTranslated(fields: Record<string, string>) {
    const merged = getMergedDrafts();
    const current = merged[activeLocale] ?? emptyDraft();
    const source = merged[defaultLocale] ?? emptyDraft();
    const { speakersText, ...plainFields } = fields;
    const nextDraft = applyNonemptyTranslatedFields(current, plainFields);
    nextDraft.speakers = deserializeSpeakers(speakersText ?? '', source.speakers);
    const nextDrafts = { ...merged, [activeLocale]: nextDraft };
    setDrafts(nextDrafts);
    localeForm.setFieldsValue(nextDraft);
  }

  useEffect(() => {
    if (!open) return;
    const first = activeLanguages[0]?.code ?? 'zh';
    const next = buildDrafts(detail, activeLanguages);
    setActiveLocale(first);
    setSectionTab('content');
    setDrafts(next);
    setAgenda(detail?.agenda ?? []);
    localeForm.setFieldsValue(next[first] ?? emptyDraft());
    sharedForm.setFieldsValue({
      slug: detail?.slug ?? '',
      status: detail?.status ?? 'upcoming',
      startDate: detail?.startDate ? dayjs(detail.startDate) : null,
      endDate: detail?.endDate ? dayjs(detail.endDate) : null,
      cover: {
        mode: detail?.coverMode ?? '',
        value: detail?.coverValue ?? '',
        previewUrl: detail?.coverPreviewUrl ?? '',
      },
      venueImage: detail?.venueImage ?? '',
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function switchLocale(locale: string) {
    const next = { ...drafts, [activeLocale]: localeForm.getFieldsValue(true) as LocaleDraft };
    setDrafts(next);
    setActiveLocale(locale);
    localeForm.setFieldsValue(next[locale] ?? emptyDraft());
  }

  function handleGroupSave(saved: AgendaGroup) {
    setAgenda((prev) => {
      const exists = prev.some((g) => g.id === saved.id);
      return exists ? prev.map((g) => (g.id === saved.id ? saved : g)) : [...prev, saved];
    });
    setGroupDrawerOpen(false);
    setEditingGroup(null);
  }

  function save() {
    startTransition(async () => {
      try {
        const shared = sharedForm.getFieldsValue(true) as SharedFormValues;
        const merged = getMergedDrafts();
        setDrafts(merged);
        const defaultDraft = merged[defaultLocale] ?? emptyDraft();

        if (!defaultDraft.title.trim()) {
          setActiveLocale(defaultLocale);
          localeForm.setFieldsValue(defaultDraft);
          setSectionTab('content');
          message.error('请输入标题');
          return;
        }

        let resolvedSlug = detail?.slug ?? '';
        if (isCreate) {
          const check = validateSourceThenAutoSlug({ locale: defaultLocale || activeLocale, sourceText: defaultDraft.title.trim(), slug: shared.slug ?? '', emptySourceMessage: '请输入标题', section: 'content' });
          if (!check.ok) { message.error(check.message); return; }
          resolvedSlug = check.autoSlug ?? resolveSlugForSave({ sourceText: defaultDraft.title, slug: shared.slug }) ?? '';
          if (check.autoSlug) sharedForm.setFieldValue('slug', resolvedSlug);
        } else {
          resolvedSlug = resolveSlugForSave({ sourceText: defaultDraft.title, slug: shared.slug }) ?? '';
        }
        if (!resolvedSlug) { message.error('请填写 Slug'); return; }

        const targets = activeLanguages
          .map((l) => ({ locale: l.code, draft: merged[l.code] ?? emptyDraft() }))
          .filter((t) => shouldPersistLocaleDraft({ locale: t.locale, defaultLocale, primaryText: t.draft.title }) || (t.locale !== defaultLocale && hasDraftContent(t.draft)));

        let summitId = detail?.id;

        const sharedPayload = {
          slug: resolvedSlug,
          status: shared.status ?? 'upcoming',
          startDate: shared.startDate ? (shared.startDate as dayjs.Dayjs).toISOString() : null,
          endDate: shared.endDate ? (shared.endDate as dayjs.Dayjs).toISOString() : null,
          coverMode: shared.cover?.mode ?? '',
          coverValue: shared.cover?.value?.trim() ?? '',
          venueImage: shared.venueImage?.trim() ?? '',
          agenda,
        };

        if (!detail) {
          const r = await fetch('/api/admin/summits', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...sharedPayload, translation: buildTranslationBody(defaultDraft, defaultLocale) }),
          });
          if (!r.ok) { const e = await r.json().catch(() => null); throw new Error(e?.message ?? '创建失败'); }
          const created = (await r.json()) as AdminSummitDetail;
          summitId = created.id;
        }

        if (!summitId) throw new Error('保存失败');

        for (const t of targets) {
          if (!detail && t.locale === defaultLocale) continue;
          const saveDraft = t.draft.title.trim() ? t.draft : { ...t.draft, title: defaultDraft.title };
          const r = await fetch(`/api/admin/summits/${summitId}/translations`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(buildTranslationBody(saveDraft, t.locale)),
          });
          if (!r.ok) { const e = await r.json().catch(() => null); throw new Error(e?.message ?? '保存翻译失败'); }
        }

        if (detail) {
          const r = await fetch(`/api/admin/summits/${summitId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(sharedPayload),
          });
          if (!r.ok) { const e = await r.json().catch(() => null); throw new Error(e?.message ?? '保存失败'); }
        }

        const dr = await fetch(`/api/admin/summits/${summitId}`);
        if (!dr.ok) throw new Error('刷新详情失败');
        const refreshed = (await dr.json()) as AdminSummitDetail;
        onSaved(refreshed);
        message.success('保存成功');
      } catch (error) {
        if (error && typeof error === 'object' && 'errorFields' in error) return;
        message.error(error instanceof Error ? error.message : '保存失败');
      }
    });
  }

  const agendaColumns = [
    {
      title: '时间文案', dataIndex: 'dayLabel', width: 160,
      render: (v: string) => <Typography.Text style={{ fontFamily: 'monospace' }}>{v}</Typography.Text>,
    },
    { title: '分组标题', dataIndex: 'groupTitle', ellipsis: true },
    { title: '环节数', width: 70, render: (_: unknown, g: AgendaGroup) => g.items.length },
    {
      title: '操作', width: 90,
      render: (_: unknown, g: AgendaGroup) => (
        <Space size={0}>
          <Button type="text" icon={<EditOutlined />} onClick={() => { setEditingGroup(g); setGroupDrawerOpen(true); }} />
          <Popconfirm title="确定删除此分组？" onConfirm={() => setAgenda((p) => p.filter((x) => x.id !== g.id))}>
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const modalTitle = detail ? `编辑行业峰会 · ${detail.slug}` : '新建行业峰会';

  return (
    <>
      <Modal
        open={open}
        title={modalTitle}
        width={1000}
        onCancel={onClose}
        footer={null}
        className="content-editor-modal"
        rootClassName="content-editor-modal-wrap"
        style={{ top: 48 }}
        styles={{ body: { overflow: 'visible', minWidth: 0 } }}
        destroyOnHidden
      >
        <Space direction="vertical" size="large" style={{ width: '100%', maxWidth: '100%', minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button type="primary" loading={isPending} onClick={save}>保存</Button>
          </div>

          {/* 通用区 */}
          <div className="content-editor-shared-section">
            <Form form={sharedForm} layout="vertical">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
                <Form.Item name="slug" label="Slug（各语言共用）" extra="留空将根据标题自动生成">
                  <Input placeholder="cfvc-2026" onBlur={() => {
                    if (!isCreate) return;
                    const slug = sharedForm.getFieldValue('slug');
                    const title = localeForm.getFieldValue('title');
                    if (!slug?.trim() && title?.trim()) sharedForm.setFieldValue('slug', textToSlug(title));
                  }} />
                </Form.Item>
                <Form.Item name="status" label="会议状态" rules={[{ required: true }]}>
                  <Select options={statusOptions} style={{ width: '100%' }} />
                </Form.Item>
                <Form.Item name="startDate" label="开始时间">
                  <DatePicker showTime format="YYYY-MM-DD HH:mm" style={{ width: '100%' }} />
                </Form.Item>
                <Form.Item name="endDate" label="结束时间">
                  <DatePicker showTime format="YYYY-MM-DD HH:mm" style={{ width: '100%' }} />
                </Form.Item>
              </div>
              <Form.Item
                name="cover"
                label="封面图（各语言共用）"
                getValueFromEvent={(v: CoverOptionValue | null) => v ?? { mode: '', value: '', previewUrl: '' }}
              >
                <CoverOptionField />
              </Form.Item>
              <Form.Item name="venueImage" label="地点图（各语言共用）" getValueFromEvent={(v: string | null) => v ?? ''}>
                <CoverImageField folder="summits/venues" />
              </Form.Item>

              {/* 会议议程 */}
              <Form.Item label="会议议程">
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Table
                    rowKey="id"
                    size="small"
                    pagination={false}
                    columns={agendaColumns}
                    dataSource={agenda}
                    locale={{ emptyText: '暂无议程分组' }}
                  />
                  <Button icon={<PlusOutlined />} onClick={() => { setEditingGroup(null); setGroupDrawerOpen(true); }}>
                    添加议程分组
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </div>

          {/* 多语言区 */}
          <Form form={localeForm} layout="vertical" preserve>
            <div className="content-editor-layout">
              <div className="content-editor-locale-nav">
                {activeLanguages.map((l) => (
                  <ContentEditorLocaleTab
                    key={l.code}
                    language={l}
                    isActive={l.code === activeLocale}
                    persisted={detail?.translations.some((t) => t.locale === l.code) ?? false}
                    onClick={() => switchLocale(l.code)}
                  />
                ))}
              </div>
              <div className="content-editor-main">
                <div className="content-editor-section-toolbar">
                  <Tabs
                    activeKey={sectionTab}
                    onChange={(k) => setSectionTab(k as SectionTabKey)}
                    className="content-editor-section-tabs"
                    items={[
                      { key: 'content', label: '内容' },
                      { key: 'speakers', label: '嘉宾' },
                      { key: 'venue', label: '会议配置' },
                    ]}
                  />
                  <ContentTranslateButton
                    contentType="summit"
                    defaultLocale={defaultLocale}
                    activeLocale={activeLocale}
                    disabled={isPending}
                    getDefaultSourceFields={getDefaultSourceFields}
                    hasDefaultPersisted={() => Boolean(detail?.translations.some((t) => t.locale === defaultLocale))}
                    hasTargetContent={hasTargetLocaleContent}
                    onTranslated={handleTranslated}
                  />
                </div>

                {/* 内容 Tab */}
                <div style={{ display: sectionTab === 'content' ? 'block' : 'none' }}>
                  <Form.Item
                    name="title"
                    label="标题"
                    rules={activeLocale === defaultLocale ? [{ required: true, message: '请输入标题' }] : []}
                  >
                    <Input onBlur={() => {
                      if (!isCreate) return;
                      const title = localeForm.getFieldValue('title');
                      const slug = sharedForm.getFieldValue('slug');
                      if (!slug?.trim() && title?.trim()) sharedForm.setFieldValue('slug', textToSlug(title));
                    }} />
                  </Form.Item>
                  <Form.Item name="description" label="描述">
                    <Input.TextArea rows={4} />
                  </Form.Item>
                </div>

                {/* 嘉宾 Tab */}
                <div style={{ display: sectionTab === 'speakers' ? 'block' : 'none' }}>
                  <Form.List name="speakers">
                    {(fields, { add, remove }) => (
                      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                        {fields.map((field) => (
                          <div key={field.key} style={{ border: '1px solid #f0f0f0', borderRadius: 8, padding: 12 }}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                              <Popconfirm title="确定删除此嘉宾？" onConfirm={() => remove(field.name)}>
                                <Button type="text" danger icon={<DeleteOutlined />} size="small">删除</Button>
                              </Popconfirm>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
                              <Form.Item name={[field.name, 'name']} label="姓名" style={{ marginBottom: 8 }}>
                                <Input />
                              </Form.Item>
                              <Form.Item name={[field.name, 'expertise']} label="擅长领域" style={{ marginBottom: 8 }}>
                                <Input placeholder="如：V-CLAMP 临床" />
                              </Form.Item>
                            </div>
                            <Form.Item name={[field.name, 'avatar']} label="头像" style={{ marginBottom: 8 }} getValueFromEvent={(v: string | null) => v ?? ''}>
                              <CoverImageField folder="summits/speakers" />
                            </Form.Item>
                            <Form.Item name={[field.name, 'bio']} label="简介" style={{ marginBottom: 0 }}>
                              <Input.TextArea rows={2} placeholder="如：主任医师 · 北京伴侣动物中心医院" />
                            </Form.Item>
                            <Form.Item name={[field.name, 'id']} hidden><Input /></Form.Item>
                          </div>
                        ))}
                        <Button
                          type="dashed"
                          icon={<PlusOutlined />}
                          onClick={() => add({ id: crypto.randomUUID(), name: '', avatar: '', bio: '', expertise: '' })}
                        >
                          添加嘉宾
                        </Button>
                      </Space>
                    )}
                  </Form.List>
                </div>

                {/* 会议配置 Tab */}
                <div style={{ display: sectionTab === 'venue' ? 'block' : 'none' }}>
                  <Form.Item name="scale" label="会议规模"><Input placeholder="如：主会场 500 座 + 4 个分会场" /></Form.Item>
                  <Form.Item name="duration" label="会议周期"><Input placeholder="如：5 天" /></Form.Item>
                  <Form.Item name="location" label="地理位置"><Input placeholder="如：中国 · 北京" /></Form.Item>
                  <Form.Item name="address" label="地址"><Input placeholder="如：北京市朝阳区天辰东路 7 号" /></Form.Item>
                  <Form.Item name="transportation" label="交通指引"><Input.TextArea rows={2} placeholder="如：地铁 8 号线奥林匹克公园站 D 出口步行 5 分钟" /></Form.Item>
                </div>
              </div>
            </div>
          </Form>
        </Space>
      </Modal>

      <AgendaGroupDrawer
        open={groupDrawerOpen}
        group={editingGroup}
        activeLanguages={activeLanguages}
        onClose={() => { setGroupDrawerOpen(false); setEditingGroup(null); }}
        onSave={handleGroupSave}
      />
    </>
  );
}
