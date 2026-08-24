'use client';

import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, DatePicker, Form, Input, Modal, Popconfirm, Select, Space, Switch, Table, Tabs, Typography, message } from 'antd';
import dayjs from 'dayjs';
import { useEffect, useState, useTransition } from 'react';

import { ContentEditorLocaleTab } from '@/components/admin/content-editor-locale-tab';
import { ContentTranslateButton } from '@/components/admin/content-translate-button';
import { CoverImageField } from '@/components/editorial/cover-image-field';
import { RichTextEditor } from '@/components/editorial/rich-text-editor';
import {
  PartnerCenterBackgroundField,
  type PartnerCenterBackgroundValue,
} from '@/components/partner-centers/partner-center-background-field';
import { SOLID_BACKGROUND_DEFAULT } from '@/lib/partner-center-background-presets';
import { ProductVideoField } from '@/components/products/product-video-field';
import {
  CoverOptionField,
  type CoverOptionValue,
} from '@/components/shared/cover-option-field';
import { HeroCopyStyleField } from '@/components/shared/hero-copy-style-field';
import {
  HeroCoverDisplayField,
  HERO_COVER_DISPLAY_FIELD_EXTRA_NO_GALLERY,
} from '@/components/shared/hero-cover-display-field';
import { defaultAdminHeroCopyStyle, type HeroCopyStyle } from '@/lib/hero-copy-style';
import { defaultHeroCoverDisplay, type HeroCoverDisplay } from '@/lib/hero-cover-display';
import { applyNonemptyTranslatedFields } from '@/lib/content-translate-config';
import { hasMeaningfulHtmlBody } from '@/lib/editorial-html';
import { deserializeSpeakers, deserializeSponsors, serializeSpeakers, serializeSponsors } from '@/lib/content-translate-serialize';
import { AgendaGroupDrawer } from '@/components/summits/agenda-group-drawer';
import {
  type AdminSummitDetail,
  type AdminSummitTranslation,
  type AgendaGroup,
  type SpeakerItem,
  type SponsorItem,
  type SummitStat,
  normalizeSpeakerItems,
  normalizeSponsorItems,
  normalizeSummitStats,
  sponsorTierLabels,
  sponsorTiers,
  summitStatuses,
  summitStatusLabels,
} from '@/lib/summit-content';
import { shouldPersistLocaleDraft } from '@/lib/locale-draft-persistence';
import { resolveSlugForSave, textToSlug, validateSourceThenAutoSlug } from '@/lib/slug';
import type { AdminSiteLanguageRow } from '@/server/admin/languages';

type SectionTabKey = 'content' | 'stats' | 'speakers' | 'sponsors' | 'venue';

type LocaleDraft = {
  title: string;
  description: string;
  detailDescription: string;
  scale: string;
  duration: string;
  location: string;
  address: string;
  transportation: string;
  stats: SummitStat[];
  speakers: SpeakerItem[];
  sponsors: SponsorItem[];
};

type SharedFormValues = {
  slug: string;
  status: string;
  startDate: dayjs.Dayjs | null;
  endDate: dayjs.Dayjs | null;
  cover: CoverOptionValue;
  videoUrl: string;
  showCoverOnBackground: boolean;
  coverDisplay: HeroCoverDisplay;
  heroCopyStyle: HeroCopyStyle;
  background: PartnerCenterBackgroundValue;
  venueImage: string;
};

type Props = {
  open: boolean;
  detail: AdminSummitDetail | null;
  activeLanguages: AdminSiteLanguageRow[];
  onClose: () => void;
  onSaved: (detail: AdminSummitDetail) => void;
};

const PAIR_SEP = '|||';

function emptyDraft(): LocaleDraft {
  return {
    title: '',
    description: '',
    detailDescription: '',
    scale: '',
    duration: '',
    location: '',
    address: '',
    transportation: '',
    stats: [],
    speakers: [],
    sponsors: [],
  };
}

function serializePairText(rows: SummitStat[]): string {
  return rows
    .filter((row) => row.label?.trim() || row.value?.trim())
    .map((row) => `${row.label ?? ''}${PAIR_SEP}${row.value ?? ''}`)
    .join('\n');
}

function deserializePairText(value: string): SummitStat[] {
  if (!value.trim()) return [];
  return value.split('\n').map((line) => {
    const [label = '', statValue = ''] = line.split(PAIR_SEP);
    return { label: label.trim(), value: statValue.trim() };
  }).filter((row) => row.label || row.value);
}

function translationToDraft(t: AdminSummitTranslation): LocaleDraft {
  return {
    title: t.title,
    description: t.description,
    detailDescription: t.detailDescription ?? '',
    scale: t.scale,
    duration: t.duration,
    location: t.location,
    address: t.address,
    transportation: t.transportation,
    stats: normalizeSummitStats(t.stats),
    speakers: normalizeSpeakerItems(t.speakers),
    sponsors: normalizeSponsorItems(t.sponsors),
  };
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
  return Boolean(
    d.title.trim()
    || d.description.trim()
    || hasMeaningfulHtmlBody(d.detailDescription)
    || d.location.trim()
    || d.stats.some((row) => row.label?.trim() || row.value?.trim())
    || d.speakers.some((speaker) => speaker.name?.trim() || speaker.bio?.trim())
    || d.sponsors.some((sponsor) => sponsor.name?.trim() || sponsor.intro?.trim()),
  );
}

function buildTranslationBody(d: LocaleDraft, locale: string) {
  return {
    locale,
    title: d.title.trim(),
    description: d.description.trim(),
    detailDescription: d.detailDescription.trim(),
    scale: d.scale.trim(),
    duration: d.duration.trim(),
    location: d.location.trim(),
    address: d.address.trim(),
    transportation: d.transportation.trim(),
    stats: normalizeSummitStats(d.stats),
    speakers: normalizeSpeakerItems(d.speakers),
    sponsors: normalizeSponsorItems(d.sponsors),
  };
}

function emptySpeaker(): SpeakerItem {
  return {
    id: crypto.randomUUID(),
    name: '',
    avatar: '',
    bio: '',
    expertise: '',
    region: '',
    badgeText: '',
    description: '',
  };
}

function emptySponsor(): SponsorItem {
  return {
    id: crypto.randomUUID(),
    tier: 'gold',
    name: '',
    logo: '',
    badgeText: '',
    intro: '',
  };
}

const statusOptions = summitStatuses.map((v) => ({ value: v, label: summitStatusLabels[v] }));
const sponsorTierOptions = sponsorTiers.map((tier) => ({ value: tier, label: sponsorTierLabels[tier] }));

export function SummitEditorModal({ open, detail, activeLanguages, onClose, onSaved }: Props) {
  const [sharedForm] = Form.useForm<SharedFormValues>();
  const [localeForm] = Form.useForm<LocaleDraft>();
  const [activeLocale, setActiveLocale] = useState(activeLanguages[0]?.code ?? 'zh');
  const [sectionTab, setSectionTab] = useState<SectionTabKey>('content');
  const [drafts, setDrafts] = useState<Record<string, LocaleDraft>>({});
  const [agenda, setAgenda] = useState<AgendaGroup[]>([]);
  const [editorRevision, setEditorRevision] = useState(0);
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
      detailDescription: draft.detailDescription,
      scale: draft.scale,
      duration: draft.duration,
      location: draft.location,
      address: draft.address,
      transportation: draft.transportation,
      statsText: serializePairText(draft.stats),
      speakersText: serializeSpeakers(draft.speakers),
      sponsorsText: serializeSponsors(draft.sponsors),
    };
  }

  function hasTargetLocaleContent() {
    const draft = getMergedDrafts()[activeLocale] ?? emptyDraft();
    return hasDraftContent(draft);
  }

  function handleTranslated(fields: Record<string, string>) {
    const merged = getMergedDrafts();
    const current = merged[activeLocale] ?? emptyDraft();
    const source = merged[defaultLocale] ?? emptyDraft();
    const { speakersText, sponsorsText, statsText, stats: statsField, ...plainFields } = fields;
    const nextDraft = applyNonemptyTranslatedFields(current, plainFields);
    const translatedStats = deserializePairText(statsText || statsField || '');
    nextDraft.stats = (translatedStats.length ? translatedStats : source.stats).map((row) => ({
      label: row.label,
      value: row.value,
    }));
    nextDraft.speakers = deserializeSpeakers(speakersText ?? '', source.speakers);
    nextDraft.sponsors = deserializeSponsors(sponsorsText ?? '', source.sponsors);
    const nextDrafts = { ...merged, [activeLocale]: nextDraft };
    setDrafts(nextDrafts);
    localeForm.setFieldsValue(nextDraft);
    setEditorRevision((v) => v + 1);
  }

  useEffect(() => {
    if (!open) return;
    const first = activeLanguages[0]?.code ?? 'zh';
    const next = buildDrafts(detail, activeLanguages);
    setActiveLocale(first);
    setSectionTab('content');
    setDrafts(next);
    setAgenda(detail?.agenda ?? []);
    setEditorRevision((v) => v + 1);
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
      videoUrl: detail?.videoUrl ?? '',
      showCoverOnBackground: detail?.showCoverOnBackground ?? true,
      coverDisplay: detail?.coverDisplay ?? defaultHeroCoverDisplay(false),
      heroCopyStyle: detail?.heroCopyStyle ?? defaultAdminHeroCopyStyle(),
      background: {
        mode: detail?.backgroundMode ?? '',
        value: detail?.backgroundMode === 'solid'
          ? SOLID_BACKGROUND_DEFAULT
          : (detail?.backgroundValue ?? ''),
        previewUrl: detail?.backgroundPreviewUrl ?? '',
      },
      venueImage: detail?.venueImage ?? '',
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function switchLocale(locale: string) {
    const next = { ...drafts, [activeLocale]: localeForm.getFieldsValue(true) as LocaleDraft };
    setDrafts(next);
    setActiveLocale(locale);
    setEditorRevision((v) => v + 1);
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
          videoUrl: shared.videoUrl?.trim() ?? '',
          backgroundMode: shared.background?.mode ?? '',
          backgroundValue: shared.background?.value?.trim() ?? '',
          showCoverOnBackground: Boolean(shared.showCoverOnBackground),
          coverDisplay: shared.coverDisplay ?? defaultHeroCoverDisplay(false),
          heroCopyStyle: shared.heroCopyStyle ?? defaultAdminHeroCopyStyle(),
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
              <Form.Item name="videoUrl" label="视频" getValueFromEvent={(v: string | null) => v ?? ''}>
                <ProductVideoField folder="summits/videos" />
              </Form.Item>
              <Form.Item
                name="showCoverOnBackground"
                label="大背景图同时显示封面"
                valuePropName="checked"
                extra="开启后，详情页看板在大背景图右侧同时展示封面图"
              >
                <Switch checkedChildren="开" unCheckedChildren="关" />
              </Form.Item>
              <Form.Item
                name="coverDisplay"
                label="封面显示"
                extra={HERO_COVER_DISPLAY_FIELD_EXTRA_NO_GALLERY}
                initialValue={defaultHeroCoverDisplay(false)}
              >
                <HeroCoverDisplayField includeGallery={false} />
              </Form.Item>
              <Form.Item
                name="heroCopyStyle"
                label="看板文案风格"
                initialValue="light"
              >
                <HeroCopyStyleField />
              </Form.Item>
              <Form.Item
                name="background"
                label="大背景图（各语言共用）"
                getValueFromEvent={(v: PartnerCenterBackgroundValue | null) => v ?? { mode: '', value: '', previewUrl: '' }}
              >
                <PartnerCenterBackgroundField solidImmediate />
              </Form.Item>
              <Form.Item name="venueImage" label="地点图（各语言共用）" getValueFromEvent={(v: string | null) => v ?? ''}>
                <CoverImageField folder="summits/venues" />
              </Form.Item>

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
                      { key: 'stats', label: '数据指标' },
                      { key: 'speakers', label: '嘉宾' },
                      { key: 'sponsors', label: '赞助商' },
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
                  <Form.Item name="description" label="简介">
                    <Input.TextArea rows={4} />
                  </Form.Item>
                  <Form.Item name="detailDescription" label="描述">
                    <RichTextEditor key={`${activeLocale}-detail-${editorRevision}`} />
                  </Form.Item>
                </div>

                <div style={{ display: sectionTab === 'stats' ? 'block' : 'none' }}>
                  <Form.List name="stats">
                    {(fields, { add, remove }) => (
                      <Space direction="vertical" size="small" style={{ width: '100%' }}>
                        {fields.map((field) => (
                          <div key={field.key} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                            <Form.Item name={[field.name, 'label']} style={{ flex: 1, marginBottom: 0 }}>
                              <Input placeholder="指标名" />
                            </Form.Item>
                            <Form.Item name={[field.name, 'value']} style={{ flex: 1, marginBottom: 0 }}>
                              <Input placeholder="指标值，如 50+" />
                            </Form.Item>
                            <Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(field.name)} />
                          </div>
                        ))}
                        <Button type="dashed" onClick={() => add()} icon={<PlusOutlined />}>
                          添加指标
                        </Button>
                      </Space>
                    )}
                  </Form.List>
                </div>

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
                              <Form.Item name={[field.name, 'region']} label="所在地区" style={{ marginBottom: 8 }}>
                                <Input placeholder="如：中国 · 北京" />
                              </Form.Item>
                            </div>
                            <Form.Item name={[field.name, 'avatar']} label="头像" style={{ marginBottom: 8 }} getValueFromEvent={(v: string | null) => v ?? ''}>
                              <CoverImageField folder="summits/speakers" />
                            </Form.Item>
                            <Form.Item name={[field.name, 'bio']} label="简介" style={{ marginBottom: 8 }}>
                              <Input.TextArea rows={2} placeholder="如：主任医师 · 北京伴侣动物中心医院" />
                            </Form.Item>
                            <Form.Item name={[field.name, 'description']} label="描述" style={{ marginBottom: 8 }}>
                              <RichTextEditor key={`${activeLocale}-${field.name}-${editorRevision}`} />
                            </Form.Item>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
                              <Form.Item name={[field.name, 'expertise']} label="擅长领域" style={{ marginBottom: 0 }}>
                                <Input placeholder="如：V-CLAMP 临床" />
                              </Form.Item>
                              <Form.Item name={[field.name, 'badgeText']} label="角标文案" style={{ marginBottom: 0 }}>
                                <Input placeholder="如：特邀专家" />
                              </Form.Item>
                            </div>
                            <Form.Item name={[field.name, 'id']} hidden><Input /></Form.Item>
                          </div>
                        ))}
                        <Button type="dashed" icon={<PlusOutlined />} onClick={() => add(emptySpeaker())}>
                          添加嘉宾
                        </Button>
                      </Space>
                    )}
                  </Form.List>
                </div>

                <div style={{ display: sectionTab === 'sponsors' ? 'block' : 'none' }}>
                  <Form.List name="sponsors">
                    {(fields, { add, remove }) => (
                      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                        {fields.map((field) => (
                          <div key={field.key} style={{ border: '1px solid #f0f0f0', borderRadius: 8, padding: 12 }}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                              <Popconfirm title="确定删除此赞助商？" onConfirm={() => remove(field.name)}>
                                <Button type="text" danger icon={<DeleteOutlined />} size="small">删除</Button>
                              </Popconfirm>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
                              <Form.Item name={[field.name, 'tier']} label="赞助商级别" style={{ marginBottom: 8 }}>
                                <Select options={sponsorTierOptions} />
                              </Form.Item>
                              <Form.Item name={[field.name, 'name']} label="名称" style={{ marginBottom: 8 }}>
                                <Input />
                              </Form.Item>
                            </div>
                            <Form.Item name={[field.name, 'logo']} label="头像/Logo" style={{ marginBottom: 8 }} getValueFromEvent={(v: string | null) => v ?? ''}>
                              <CoverImageField folder="summits/sponsors" />
                            </Form.Item>
                            <Form.Item name={[field.name, 'badgeText']} label="角标文案" style={{ marginBottom: 8 }}>
                              <Input placeholder="如：Diamond Sponsor" />
                            </Form.Item>
                            <Form.Item name={[field.name, 'intro']} label="简介" style={{ marginBottom: 0 }}>
                              <Input.TextArea rows={2} />
                            </Form.Item>
                            <Form.Item name={[field.name, 'id']} hidden><Input /></Form.Item>
                          </div>
                        ))}
                        <Button type="dashed" icon={<PlusOutlined />} onClick={() => add(emptySponsor())}>
                          添加赞助商
                        </Button>
                      </Space>
                    )}
                  </Form.List>
                </div>

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
