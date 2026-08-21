'use client';

import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Form, Input, Modal, Select, Space, Switch, Tabs, message } from 'antd';
import { useEffect, useState, useTransition } from 'react';

import { ContentEditorLocaleTab } from '@/components/admin/content-editor-locale-tab';
import { ContentTranslateButton } from '@/components/admin/content-translate-button';
import { CoverImageField } from '@/components/editorial/cover-image-field';
import { RichTextEditor } from '@/components/editorial/rich-text-editor';
import {
  PartnerCenterBackgroundField,
  type PartnerCenterBackgroundValue,
} from '@/components/partner-centers/partner-center-background-field';
import { ProductGalleryField } from '@/components/products/product-gallery-field';
import { ProductVideoField } from '@/components/products/product-video-field';
import { SurgeonPickerField } from '@/components/surgeons/surgeon-picker-field';
import { applyNonemptyTranslatedFields } from '@/lib/content-translate-config';
import { deserializeLineList, serializeLineList } from '@/lib/content-translate-serialize';
import { hasMeaningfulHtmlBody } from '@/lib/editorial-html';
import {
  type AdminPartnerCenterDetail,
  type AdminPartnerCenterTranslation,
  type CenterRegion,
  type PartnerCenterMetric,
  centerRegionLabels,
  centerRegions,
  normalizePartnerCenterMetrics,
} from '@/lib/partner-center-content';
import type { ProductGalleryImage } from '@/lib/product-content';
import { shouldPersistLocaleDraft } from '@/lib/locale-draft-persistence';
import { resolveSlugForSave, textToSlug, validateSourceThenAutoSlug } from '@/lib/slug';
import type { AdminSiteLanguageRow } from '@/server/admin/languages';

type SectionTabKey = 'content' | 'detail' | 'stats' | 'cooperation' | 'tags';

type LocaleDraft = {
  name: string;
  description: string;
  detailDescription: string;
  location: string;
  badgeText: string;
  address: string;
  businessHours: string;
  contact: string;
  tags: string[];
  stats: PartnerCenterMetric[];
  cooperationInfo: PartnerCenterMetric[];
};

type LocaleFormValues = {
  name: string;
  description: string;
  detailDescription: string;
  location: string;
  badgeText: string;
  address: string;
  businessHours: string;
  contact: string;
  tags: Array<{ name: string }>;
  stats: PartnerCenterMetric[];
  cooperationInfo: PartnerCenterMetric[];
};

type SharedFormValues = {
  slug: string;
  region: CenterRegion;
  email: string;
  website: string;
  coverImage: string;
  gallery: ProductGalleryImage[];
  videoUrl: string;
  logo: string;
  showCoverOnBackground: boolean;
  background: PartnerCenterBackgroundValue;
  surgeonIds: string[];
};

type Props = {
  open: boolean;
  detail: AdminPartnerCenterDetail | null;
  activeLanguages: AdminSiteLanguageRow[];
  onClose: () => void;
  onSaved: (detail: AdminPartnerCenterDetail) => void;
};

function emptyDraft(): LocaleDraft {
  return {
    name: '',
    description: '',
    detailDescription: '',
    location: '',
    badgeText: '',
    address: '',
    businessHours: '',
    contact: '',
    tags: [],
    stats: [],
    cooperationInfo: [],
  };
}

function translationToDraft(t: AdminPartnerCenterTranslation): LocaleDraft {
  return {
    name: t.name,
    description: t.description,
    detailDescription: t.detailDescription ?? '',
    location: t.location,
    badgeText: t.badgeText,
    address: t.address,
    businessHours: t.businessHours,
    contact: t.contact,
    tags: (t.tags ?? []).filter(Boolean),
    stats: normalizePartnerCenterMetrics(t.stats),
    cooperationInfo: normalizePartnerCenterMetrics(t.cooperationInfo),
  };
}

function buildDrafts(detail: AdminPartnerCenterDetail | null, languages: AdminSiteLanguageRow[]): Record<string, LocaleDraft> {
  const d: Record<string, LocaleDraft> = {};
  for (const l of languages) {
    const t = detail?.translations.find((i) => i.locale === l.code);
    d[l.code] = t ? translationToDraft(t) : emptyDraft();
  }
  return d;
}

function draftToForm(d: LocaleDraft): LocaleFormValues {
  return {
    ...d,
    tags: d.tags.map((n) => ({ name: n })),
    stats: d.stats.length ? d.stats : [],
    cooperationInfo: d.cooperationInfo.length ? d.cooperationInfo : [],
  };
}

function readDraft(v: LocaleFormValues): LocaleDraft {
  return {
    name: v.name ?? '',
    description: v.description ?? '',
    detailDescription: v.detailDescription ?? '',
    location: v.location ?? '',
    badgeText: v.badgeText ?? '',
    address: v.address ?? '',
    businessHours: v.businessHours ?? '',
    contact: v.contact ?? '',
    tags: (v.tags ?? []).map((r) => (typeof r === 'string' ? r : r?.name ?? '')).filter(Boolean),
    stats: normalizePartnerCenterMetrics(v.stats),
    cooperationInfo: normalizePartnerCenterMetrics(v.cooperationInfo),
  };
}

function hasDraftContent(d: LocaleDraft): boolean {
  return Boolean(
    d.name.trim()
    || d.description.trim()
    || hasMeaningfulHtmlBody(d.detailDescription)
    || d.location.trim()
    || d.stats.some((row) => row.label || row.value)
    || d.cooperationInfo.some((row) => row.label || row.value),
  );
}

function serializePairText(rows: PartnerCenterMetric[]): string {
  return rows
    .map((row) => `${row.label}|||${row.value}`)
    .join('\n');
}

function deserializePairText(value: string): PartnerCenterMetric[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [label = '', value = ''] = line.split('|||');
      return { label: label.trim(), value: value.trim() };
    })
    .filter((row) => row.label || row.value);
}

function buildTranslationBody(d: LocaleDraft, locale: string) {
  return {
    locale,
    name: d.name.trim(),
    description: d.description.trim(),
    detailDescription: d.detailDescription.trim(),
    location: d.location.trim(),
    badgeText: d.badgeText.trim(),
    address: d.address.trim(),
    businessHours: d.businessHours.trim(),
    contact: d.contact.trim(),
    tags: d.tags.map((t) => t.trim()).filter(Boolean),
    stats: normalizePartnerCenterMetrics(d.stats),
    cooperationInfo: normalizePartnerCenterMetrics(d.cooperationInfo),
  };
}

const regionOptions = centerRegions.map((v) => ({ value: v, label: centerRegionLabels[v] }));

export function PartnerCenterEditorModal({ open, detail, activeLanguages, onClose, onSaved }: Props) {
  const [form] = Form.useForm<LocaleFormValues>();
  const [sharedForm] = Form.useForm<SharedFormValues>();
  const [activeLocale, setActiveLocale] = useState(activeLanguages[0]?.code ?? 'zh');
  const [sectionTab, setSectionTab] = useState<SectionTabKey>('content');
  const [drafts, setDrafts] = useState<Record<string, LocaleDraft>>({});
  const [editorRevision, setEditorRevision] = useState(0);
  const [isPending, startTransition] = useTransition();
  const isCreate = !detail;
  const defaultLocale = activeLanguages.find((l) => l.isDefault)?.code ?? activeLanguages[0]?.code ?? '';

  function getMergedDrafts() {
    return { ...drafts, [activeLocale]: readDraft(form.getFieldsValue(true)) };
  }

  function getDefaultSourceFields(): Record<string, string> {
    const draft = getMergedDrafts()[defaultLocale] ?? emptyDraft();
    return {
      name: draft.name,
      badgeText: draft.badgeText,
      location: draft.location,
      description: draft.description,
      detailDescription: draft.detailDescription,
      address: draft.address,
      businessHours: draft.businessHours,
      contact: draft.contact,
      tagsText: serializeLineList(draft.tags),
      statsText: serializePairText(draft.stats),
      cooperationInfoText: serializePairText(draft.cooperationInfo),
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
    const {
      tagsText,
      statsText,
      cooperationInfoText,
      stats: statsField,
      cooperationInfo: cooperationField,
      ...plainFields
    } = fields as Record<string, string>;
    const nextDraft = applyNonemptyTranslatedFields(current, plainFields);
    const tags = deserializeLineList(tagsText ?? '');
    if (tags.length) nextDraft.tags = tags;
    else if (source.tags.length) nextDraft.tags = source.tags;

    const translatedStats = deserializePairText(statsText || statsField || '');
    nextDraft.stats = (translatedStats.length ? translatedStats : source.stats).map((row) => ({
      label: row.label,
      value: row.value,
    }));

    const translatedCoop = deserializePairText(cooperationInfoText || cooperationField || '');
    nextDraft.cooperationInfo = (translatedCoop.length ? translatedCoop : source.cooperationInfo).map((row) => ({
      label: row.label,
      value: row.value,
    }));

    const nextDrafts = { ...merged, [activeLocale]: nextDraft };
    setDrafts(nextDrafts);
    form.setFieldsValue(draftToForm(nextDraft));
    setEditorRevision((value) => value + 1);
  }

  function switchLocale(locale: string) {
    const next = { ...drafts, [activeLocale]: readDraft(form.getFieldsValue(true)) };
    setDrafts(next);
    setActiveLocale(locale);
    form.setFieldsValue(draftToForm(next[locale] ?? emptyDraft()));
    setEditorRevision((value) => value + 1);
  }

  useEffect(() => {
    if (!open) return;
    const first = activeLanguages[0]?.code ?? 'zh';
    const next = buildDrafts(detail, activeLanguages);
    setActiveLocale(first);
    setSectionTab('content');
    setDrafts(next);
    form.setFieldsValue(draftToForm(next[first] ?? emptyDraft()));
    sharedForm.setFieldsValue({
      slug: detail?.slug ?? '',
      region: detail?.region ?? 'asia-pacific',
      email: detail?.email ?? '',
      website: detail?.website ?? '',
      coverImage: detail?.coverImage ?? '',
      gallery: detail?.gallery ?? [],
      videoUrl: detail?.videoUrl ?? '',
      logo: detail?.logo ?? '',
      showCoverOnBackground: detail?.showCoverOnBackground ?? true,
      background: {
        mode: detail?.backgroundMode ?? '',
        value: detail?.backgroundValue ?? '',
        previewUrl: detail?.backgroundPreviewUrl ?? '',
      },
      surgeonIds: detail?.surgeonIds ?? [],
    });
    setEditorRevision((value) => value + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function save() {
    startTransition(async () => {
      try {
        await form.validateFields();
        const shared = sharedForm.getFieldsValue(true) as SharedFormValues;
        const merged = getMergedDrafts();
        setDrafts(merged);
        const defaultDraft = merged[defaultLocale] ?? emptyDraft();

        if (!defaultDraft.name.trim()) {
          setActiveLocale(defaultLocale);
          form.setFieldsValue(draftToForm(defaultDraft));
          setSectionTab('content');
          message.error('请输入名称');
          return;
        }

        let resolvedSlug = detail?.slug ?? '';
        if (isCreate) {
          const check = validateSourceThenAutoSlug({
            locale: defaultLocale || activeLocale,
            sourceText: defaultDraft.name.trim(),
            slug: shared.slug ?? '',
            emptySourceMessage: '请输入名称',
            section: 'content',
          });
          if (!check.ok) { message.error(check.message); return; }
          resolvedSlug = check.autoSlug ?? resolveSlugForSave({ sourceText: defaultDraft.name, slug: shared.slug }) ?? '';
          if (check.autoSlug) sharedForm.setFieldsValue({ slug: resolvedSlug });
        } else {
          resolvedSlug = resolveSlugForSave({ sourceText: defaultDraft.name, slug: shared.slug }) ?? '';
        }
        if (!resolvedSlug) { message.error('请填写 Slug'); return; }

        const targets = activeLanguages
          .map((l) => ({ locale: l.code, draft: merged[l.code] ?? emptyDraft() }))
          .filter((t) => shouldPersistLocaleDraft({
            locale: t.locale,
            defaultLocale,
            primaryText: t.draft.name,
          }) || (t.locale !== defaultLocale && hasDraftContent(t.draft)));

        let centerId = detail?.id;
        const sharedPayload = {
          slug: resolvedSlug,
          region: shared.region,
          email: shared.email?.trim() ?? '',
          website: shared.website?.trim() ?? '',
          coverImage: shared.coverImage?.trim() ?? '',
          gallery: (shared.gallery ?? []).filter((item) => item.url?.trim()),
          videoUrl: shared.videoUrl?.trim() ?? '',
          logo: shared.logo?.trim() ?? '',
          showCoverOnBackground: Boolean(shared.showCoverOnBackground),
          backgroundMode: shared.background?.mode ?? '',
          backgroundValue: shared.background?.value?.trim() ?? '',
          surgeonIds: shared.surgeonIds ?? [],
        };

        if (!detail) {
          const r = await fetch('/api/admin/partner-centers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...sharedPayload,
              translation: buildTranslationBody(defaultDraft, defaultLocale),
            }),
          });
          if (!r.ok) { const e = await r.json().catch(() => null); throw new Error(e?.message ?? '创建失败'); }
          const created = (await r.json()) as AdminPartnerCenterDetail;
          centerId = created.id;
        }

        if (!centerId) throw new Error('保存失败');

        for (const t of targets) {
          if (!detail && t.locale === defaultLocale) continue;
          const saveDraft = t.draft.name.trim() ? t.draft : { ...t.draft, name: defaultDraft.name };
          const r = await fetch(`/api/admin/partner-centers/${centerId}/translations`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(buildTranslationBody(saveDraft, t.locale)),
          });
          if (!r.ok) { const e = await r.json().catch(() => null); throw new Error(e?.message ?? '保存翻译失败'); }
        }

        if (detail) {
          const r = await fetch(`/api/admin/partner-centers/${centerId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(sharedPayload),
          });
          if (!r.ok) { const e = await r.json().catch(() => null); throw new Error(e?.message ?? '保存失败'); }
        }

        const dr = await fetch(`/api/admin/partner-centers/${centerId}`);
        if (!dr.ok) throw new Error('刷新详情失败');
        const refreshed = (await dr.json()) as AdminPartnerCenterDetail;
        onSaved(refreshed);
        message.success('保存成功');
      } catch (error) {
        if (error && typeof error === 'object' && 'errorFields' in error) return;
        message.error(error instanceof Error ? error.message : '保存失败');
      }
    });
  }

  const modalTitle = detail ? `编辑合作中心 · ${detail.slug}` : '新建合作中心';

  return (
    <Modal
      open={open}
      title={modalTitle}
      width={1180}
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
            <Form.Item name="slug" label="Slug（各语言共用）" extra="留空将根据名称自动生成">
              <Input
                placeholder="beijing-companion-animal-hospital"
                onBlur={() => {
                  if (!isCreate) return;
                  const slug = sharedForm.getFieldValue('slug');
                  const name = form.getFieldValue('name');
                  if (!slug?.trim() && name?.trim()) sharedForm.setFieldValue('slug', textToSlug(name));
                }}
              />
            </Form.Item>
            <Form.Item name="region" label="所在地区" rules={[{ required: true, message: '请选择地区' }]}>
              <Select options={regionOptions} style={{ width: 220 }} />
            </Form.Item>
            <Form.Item name="email" label="邮箱">
              <Input placeholder="contact@example.com" />
            </Form.Item>
            <Form.Item name="website" label="网址">
              <Input placeholder="https://" />
            </Form.Item>
            <Form.Item name="logo" label="Logo（各语言共用）" getValueFromEvent={(v: string | null) => v ?? ''}>
              <CoverImageField folder="partner-centers/logos" />
            </Form.Item>
            <Form.Item name="coverImage" label="封面图（各语言共用）" getValueFromEvent={(v: string | null) => v ?? ''}>
              <CoverImageField folder="partner-centers/covers" />
            </Form.Item>
            <Form.Item
              name="gallery"
              label="轮播图"
              getValueFromEvent={(value: ProductGalleryImage[] | undefined) => value ?? []}
            >
              <ProductGalleryField folder="partner-centers/gallery" />
            </Form.Item>
            <Form.Item name="videoUrl" label="视频" getValueFromEvent={(v: string | null) => v ?? ''}>
              <ProductVideoField folder="partner-centers/videos" />
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
              name="background"
              label="大背景图（各语言共用）"
              getValueFromEvent={(v: PartnerCenterBackgroundValue | null) => v ?? { mode: '', value: '', previewUrl: '' }}
            >
              <PartnerCenterBackgroundField />
            </Form.Item>
            <Form.Item name="surgeonIds" label="关联术者" getValueFromEvent={(v: string[] | undefined) => v ?? []}>
              <SurgeonPickerField mode="multiple" addButtonLabel="添加术者" />
            </Form.Item>
          </Form>
        </div>

        <Form form={form} layout="vertical" preserve>
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
                    { key: 'detail', label: '详情' },
                    { key: 'stats', label: '数据指标' },
                    { key: 'cooperation', label: '合作信息' },
                    { key: 'tags', label: '标签' },
                  ]}
                />
                <ContentTranslateButton
                  contentType="partnerCenter"
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
                <Form.Item name="name" label="名称" rules={activeLocale === defaultLocale ? [{ required: true, message: '请输入名称' }] : []}>
                  <Input
                    onBlur={() => {
                      if (!isCreate) return;
                      const name = form.getFieldValue('name');
                      const slug = sharedForm.getFieldValue('slug');
                      if (!slug?.trim() && name?.trim()) sharedForm.setFieldValue('slug', textToSlug(name));
                    }}
                  />
                </Form.Item>
                <Form.Item name="badgeText" label="角标文案"><Input placeholder="如：临床合作 / Clinical Partner" /></Form.Item>
                <Form.Item name="location" label="地理位置"><Input placeholder="如：中国 · 北京" /></Form.Item>
                <Form.Item name="description" label="简介"><Input.TextArea rows={3} /></Form.Item>
                <Form.Item name="detailDescription" label="详细描述">
                  <RichTextEditor key={`${activeLocale}-${editorRevision}`} />
                </Form.Item>
              </div>

              <div style={{ display: sectionTab === 'detail' ? 'block' : 'none' }}>
                <Form.Item name="address" label="地址"><Input /></Form.Item>
                <Form.Item name="businessHours" label="营业时间"><Input placeholder="如：周一至周五 09:00–18:00" /></Form.Item>
                <Form.Item name="contact" label="联系方式"><Input placeholder="电话" /></Form.Item>
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
                            <Input placeholder="指标值，如 120+" />
                          </Form.Item>
                          <Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(field.name)} />
                        </div>
                      ))}
                      <Button type="dashed" onClick={() => add()} icon={<PlusOutlined />}>添加指标</Button>
                    </Space>
                  )}
                </Form.List>
              </div>

              <div style={{ display: sectionTab === 'cooperation' ? 'block' : 'none' }}>
                <Form.List name="cooperationInfo">
                  {(fields, { add, remove }) => (
                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                      {fields.map((field) => (
                        <div key={field.key} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                          <Form.Item name={[field.name, 'label']} style={{ flex: 1, marginBottom: 0 }}>
                            <Input placeholder="名称" />
                          </Form.Item>
                          <Form.Item name={[field.name, 'value']} style={{ flex: 1, marginBottom: 0 }}>
                            <Input placeholder="值" />
                          </Form.Item>
                          <Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(field.name)} />
                        </div>
                      ))}
                      <Button type="dashed" onClick={() => add()} icon={<PlusOutlined />}>添加合作信息</Button>
                    </Space>
                  )}
                </Form.List>
              </div>

              <div style={{ display: sectionTab === 'tags' ? 'block' : 'none' }}>
                <Form.List name="tags">
                  {(fields, { add, remove }) => (
                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                      {fields.map((field) => (
                        <div key={field.key} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                          <Form.Item name={[field.name, 'name']} style={{ flex: 1, marginBottom: 0 }}>
                            <Input placeholder="标签名" />
                          </Form.Item>
                          <Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(field.name)} />
                        </div>
                      ))}
                      <Button type="dashed" onClick={() => add({ name: '' })} icon={<PlusOutlined />}>添加标签</Button>
                    </Space>
                  )}
                </Form.List>
              </div>
            </div>
          </div>
        </Form>
      </Space>
    </Modal>
  );
}
