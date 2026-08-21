'use client';

import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Form, Input, InputNumber, Modal, Radio, Space, Tabs, message } from 'antd';
import { useEffect, useState, useTransition } from 'react';

import { ContentEditorLocaleTab } from '@/components/admin/content-editor-locale-tab';
import { ContentTranslateButton } from '@/components/admin/content-translate-button';
import { CoverImageField } from '@/components/editorial/cover-image-field';
import { RichTextEditor } from '@/components/editorial/rich-text-editor';
import { applyNonemptyTranslatedFields } from '@/lib/content-translate-config';
import { deserializeLineList, serializeLineList } from '@/lib/content-translate-serialize';
import { hasMeaningfulHtmlBody } from '@/lib/editorial-html';
import {
  type AdminSurgeonDetail,
  type AdminSurgeonTranslation,
  type SurgeonGradeKey,
  type SurgeonMetric,
  normalizeSurgeonMetrics,
  surgeonGradeKeys,
} from '@/lib/surgeon-content';
import { shouldPersistLocaleDraft } from '@/lib/locale-draft-persistence';
import { resolveSlugForSave, textToSlug, validateSourceThenAutoSlug } from '@/lib/slug';
import type { AdminSiteLanguageRow } from '@/server/admin/languages';

type SectionTabKey = 'content' | 'otherCertifications' | 'specialties' | 'tags';

type LocaleDraft = {
  name: string;
  position: string;
  institution: string;
  expertise: string;
  experience: string;
  gradeTitle: string;
  detailDescription: string;
  tags: string[];
  otherCertifications: SurgeonMetric[];
  specialties: string[];
};

type LocaleFormValues = {
  name: string;
  position: string;
  institution: string;
  expertise: string;
  experience: string;
  gradeTitle: string;
  detailDescription: string;
  tags: Array<{ name: string }>;
  otherCertifications: SurgeonMetric[];
  specialties: Array<{ name: string }>;
};

type SharedFormValues = {
  avatar: string;
  slug: string;
  gradeKey: SurgeonGradeKey;
  certificationYear: number | null;
  surgeryCount: number | null;
};

type Props = {
  open: boolean;
  detail: AdminSurgeonDetail | null;
  activeLanguages: AdminSiteLanguageRow[];
  onClose: () => void;
  onSaved: (detail: AdminSurgeonDetail) => void;
};

function emptyDraft(): LocaleDraft {
  return {
    name: '',
    position: '',
    institution: '',
    expertise: '',
    experience: '',
    gradeTitle: '',
    detailDescription: '',
    tags: [],
    otherCertifications: [],
    specialties: [],
  };
}

function translationToDraft(t: AdminSurgeonTranslation): LocaleDraft {
  return {
    name: t.name,
    position: t.position,
    institution: t.institution,
    expertise: t.expertise,
    experience: t.experience,
    gradeTitle: t.gradeTitle,
    detailDescription: t.detailDescription ?? '',
    tags: (t.tags ?? []).filter(Boolean),
    otherCertifications: normalizeSurgeonMetrics(t.otherCertifications),
    specialties: (t.specialties ?? []).filter(Boolean),
  };
}

function buildDrafts(detail: AdminSurgeonDetail | null, languages: AdminSiteLanguageRow[]): Record<string, LocaleDraft> {
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
    otherCertifications: d.otherCertifications.length ? d.otherCertifications : [],
    specialties: d.specialties.map((n) => ({ name: n })),
  };
}

function readDraft(v: LocaleFormValues): LocaleDraft {
  return {
    name: v.name ?? '',
    position: v.position ?? '',
    institution: v.institution ?? '',
    expertise: v.expertise ?? '',
    experience: v.experience ?? '',
    gradeTitle: v.gradeTitle ?? '',
    detailDescription: v.detailDescription ?? '',
    tags: (v.tags ?? []).map((r) => (typeof r === 'string' ? r : r?.name ?? '')).filter(Boolean),
    otherCertifications: normalizeSurgeonMetrics(v.otherCertifications),
    specialties: (v.specialties ?? []).map((r) => (typeof r === 'string' ? r : r?.name ?? '')).filter(Boolean),
  };
}

function hasDraftContent(d: LocaleDraft): boolean {
  return Boolean(
    d.name.trim()
    || d.position.trim()
    || d.institution.trim()
    || d.expertise.trim()
    || d.experience.trim()
    || d.gradeTitle.trim()
    || hasMeaningfulHtmlBody(d.detailDescription)
    || d.tags.some(Boolean)
    || d.otherCertifications.some((row) => row.label || row.value)
    || d.specialties.some(Boolean),
  );
}

function serializePairText(rows: SurgeonMetric[]): string {
  return rows.map((row) => `${row.label}|||${row.value}`).join('\n');
}

function deserializePairText(value: string): SurgeonMetric[] {
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
    position: d.position.trim(),
    institution: d.institution.trim(),
    expertise: d.expertise.trim(),
    experience: d.experience.trim(),
    gradeTitle: d.gradeTitle.trim(),
    detailDescription: d.detailDescription.trim(),
    tags: d.tags.map((t) => t.trim()).filter(Boolean),
    otherCertifications: normalizeSurgeonMetrics(d.otherCertifications),
    specialties: d.specialties.map((t) => t.trim()).filter(Boolean),
  };
}

const gradeOptions = surgeonGradeKeys.map((value) => ({
  value,
  label: value === 'platinum' ? '铂金 Platinum' : value === 'gold' ? '金 Gold' : '银 Silver',
}));

export function SurgeonEditorModal({ open, detail, activeLanguages, onClose, onSaved }: Props) {
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

  useEffect(() => {
    if (!open) return;
    const first = activeLanguages[0]?.code ?? 'zh';
    const next = buildDrafts(detail, activeLanguages);
    setActiveLocale(first);
    setSectionTab('content');
    setDrafts(next);
    setEditorRevision((n) => n + 1);
    form.setFieldsValue(draftToForm(next[first] ?? emptyDraft()));
    sharedForm.setFieldsValue({
      avatar: detail?.avatar ?? '',
      slug: detail?.slug ?? '',
      gradeKey: detail?.gradeKey ?? 'silver',
      certificationYear: detail?.certificationYear ?? null,
      surgeryCount: detail?.surgeryCount ?? null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function getDefaultSourceFields(): Record<string, string> {
    const draft = getMergedDrafts()[defaultLocale] ?? emptyDraft();
    return {
      name: draft.name,
      position: draft.position,
      institution: draft.institution,
      expertise: draft.expertise,
      experience: draft.experience,
      gradeTitle: draft.gradeTitle,
      detailDescription: draft.detailDescription,
      tagsText: serializeLineList(draft.tags),
      otherCertificationsText: serializePairText(draft.otherCertifications),
      specialtiesText: serializeLineList(draft.specialties),
    };
  }

  function hasTargetLocaleContent() {
    return hasDraftContent(getMergedDrafts()[activeLocale] ?? emptyDraft());
  }

  function handleTranslated(fields: Record<string, string>) {
    const merged = getMergedDrafts();
    const current = merged[activeLocale] ?? emptyDraft();
    const source = merged[defaultLocale] ?? emptyDraft();
    const {
      tagsText,
      otherCertificationsText,
      specialtiesText,
      detailDescription,
      ...plainFields
    } = fields;
    const nextDraft = applyNonemptyTranslatedFields(current, plainFields);
    if (detailDescription?.trim()) nextDraft.detailDescription = detailDescription;
    const tags = deserializeLineList(tagsText ?? '');
    if (tags.length) nextDraft.tags = tags;
    else if (source.tags.length) nextDraft.tags = source.tags;
    const otherCerts = deserializePairText(otherCertificationsText ?? '');
    nextDraft.otherCertifications = (otherCerts.length ? otherCerts : source.otherCertifications).map((row) => ({
      label: row.label,
      value: row.value,
    }));
    const specialties = deserializeLineList(specialtiesText ?? '');
    if (specialties.length) nextDraft.specialties = specialties;
    else if (source.specialties.length) nextDraft.specialties = source.specialties;
    const nextDrafts = { ...merged, [activeLocale]: nextDraft };
    setDrafts(nextDrafts);
    setEditorRevision((n) => n + 1);
    form.setFieldsValue(draftToForm(nextDraft));
  }

  function switchLocale(locale: string) {
    const next = { ...drafts, [activeLocale]: readDraft(form.getFieldsValue(true)) };
    setDrafts(next);
    setActiveLocale(locale);
    setEditorRevision((n) => n + 1);
    form.setFieldsValue(draftToForm(next[locale] ?? emptyDraft()));
  }

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
          message.error('请输入姓名');
          return;
        }

        let resolvedSlug = detail?.slug ?? '';
        if (isCreate) {
          const check = validateSourceThenAutoSlug({
            locale: defaultLocale || activeLocale,
            sourceText: defaultDraft.name.trim(),
            slug: shared.slug ?? '',
            emptySourceMessage: '请输入姓名',
            section: 'content',
          });
          if (!check.ok) {
            message.error(check.message);
            return;
          }
          resolvedSlug = check.autoSlug ?? resolveSlugForSave({ sourceText: defaultDraft.name, slug: shared.slug }) ?? '';
          if (check.autoSlug) sharedForm.setFieldsValue({ slug: resolvedSlug });
        } else {
          resolvedSlug = resolveSlugForSave({ sourceText: defaultDraft.name, slug: shared.slug }) ?? '';
        }
        if (!resolvedSlug) {
          message.error('请填写 Slug');
          return;
        }

        const targets = activeLanguages
          .map((l) => ({ locale: l.code, draft: merged[l.code] ?? emptyDraft() }))
          .filter((t) =>
            shouldPersistLocaleDraft({ locale: t.locale, defaultLocale, primaryText: t.draft.name })
            || (t.locale !== defaultLocale && hasDraftContent(t.draft)),
          );

        let surgeonId = detail?.id;
        const sharedPayload = {
          slug: resolvedSlug,
          avatar: shared.avatar?.trim() ?? '',
          gradeKey: shared.gradeKey,
          certificationYear: shared.certificationYear ?? null,
          surgeryCount: shared.surgeryCount ?? null,
        };

        if (!detail) {
          const r = await fetch('/api/admin/surgeons', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...sharedPayload,
              translation: buildTranslationBody(defaultDraft, defaultLocale),
            }),
          });
          if (!r.ok) {
            const e = await r.json().catch(() => null);
            throw new Error(e?.message ?? '创建失败');
          }
          const created = (await r.json()) as AdminSurgeonDetail;
          surgeonId = created.id;
        }

        if (!surgeonId) throw new Error('保存失败');

        for (const t of targets) {
          if (!detail && t.locale === defaultLocale) continue;
          const saveDraft = t.draft.name.trim() ? t.draft : { ...t.draft, name: defaultDraft.name };
          const r = await fetch(`/api/admin/surgeons/${surgeonId}/translations`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(buildTranslationBody(saveDraft, t.locale)),
          });
          if (!r.ok) {
            const e = await r.json().catch(() => null);
            throw new Error(e?.message ?? '保存翻译失败');
          }
        }

        if (detail) {
          const r = await fetch(`/api/admin/surgeons/${surgeonId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(sharedPayload),
          });
          if (!r.ok) {
            const e = await r.json().catch(() => null);
            throw new Error(e?.message ?? '保存失败');
          }
        }

        const dr = await fetch(`/api/admin/surgeons/${surgeonId}`);
        if (!dr.ok) throw new Error('刷新详情失败');
        const refreshed = (await dr.json()) as AdminSurgeonDetail;
        onSaved(refreshed);
        message.success('保存成功');
      } catch (error) {
        if (error && typeof error === 'object' && 'errorFields' in error) return;
        message.error(error instanceof Error ? error.message : '保存失败');
      }
    });
  }

  const modalTitle = detail ? `编辑认证术者 · ${detail.slug}` : '新建认证术者';

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
            <Form.Item name="slug" label="Slug（各语言共用）" extra="留空将根据姓名自动生成">
              <Input
                placeholder="zhang-mingyuan"
                onBlur={() => {
                  if (!isCreate) return;
                  const slug = sharedForm.getFieldValue('slug');
                  const name = form.getFieldValue('name');
                  if (!slug?.trim() && name?.trim()) sharedForm.setFieldValue('slug', textToSlug(name));
                }}
              />
            </Form.Item>
            <Form.Item name="gradeKey" label="认证等级">
              <Radio.Group options={gradeOptions} optionType="button" buttonStyle="solid" />
            </Form.Item>
            <Form.Item name="certificationYear" label="认证年份">
              <InputNumber min={1990} max={2100} style={{ width: '100%' }} placeholder="如：2019" />
            </Form.Item>
            <Form.Item name="surgeryCount" label="累计手术">
              <InputNumber min={0} style={{ width: '100%' }} placeholder="如：3200" />
            </Form.Item>
            <Form.Item name="avatar" label="头像（各语言共用）" getValueFromEvent={(v: string | null) => v ?? ''}>
              <CoverImageField folder="surgeons/avatars" />
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
                    { key: 'otherCertifications', label: '其他认证信息' },
                    { key: 'specialties', label: '专业方向' },
                    { key: 'tags', label: '标签' },
                  ]}
                />
                <ContentTranslateButton
                  contentType="surgeon"
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
                  name="name"
                  label="姓名"
                  rules={activeLocale === defaultLocale ? [{ required: true, message: '请输入姓名' }] : []}
                >
                  <Input
                    onBlur={() => {
                      if (!isCreate) return;
                      const name = form.getFieldValue('name');
                      const slug = sharedForm.getFieldValue('slug');
                      if (!slug?.trim() && name?.trim()) sharedForm.setFieldValue('slug', textToSlug(name));
                    }}
                  />
                </Form.Item>
                <Form.Item name="position" label="职位"><Input placeholder="如：主任医师 · 博士" /></Form.Item>
                <Form.Item name="institution" label="执业机构"><Input /></Form.Item>
                <Form.Item name="expertise" label="擅长领域"><Input /></Form.Item>
                <Form.Item name="experience" label="资历与经验"><Input /></Form.Item>
                <Form.Item name="gradeTitle" label="等级称号"><Input placeholder="如：铂金级术者" /></Form.Item>
                <Form.Item name="detailDescription" label="详细描述">
                  <RichTextEditor key={`${activeLocale}-${editorRevision}`} />
                </Form.Item>
              </div>

              <div style={{ display: sectionTab === 'otherCertifications' ? 'block' : 'none' }}>
                <Form.List name="otherCertifications">
                  {(fields, { add, remove }) => (
                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                      {fields.map((field) => (
                        <div key={field.key} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                          <Form.Item name={[field.name, 'label']} style={{ flex: 1, marginBottom: 0 }}>
                            <Input placeholder="标签，如：认证产品" />
                          </Form.Item>
                          <Form.Item name={[field.name, 'value']} style={{ flex: 1, marginBottom: 0 }}>
                            <Input placeholder="值，如：V-CLAMP" />
                          </Form.Item>
                          <Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(field.name)} />
                        </div>
                      ))}
                      <Button type="dashed" onClick={() => add({ label: '', value: '' })} icon={<PlusOutlined />}>
                        添加认证信息
                      </Button>
                    </Space>
                  )}
                </Form.List>
              </div>

              <div style={{ display: sectionTab === 'specialties' ? 'block' : 'none' }}>
                <Form.List name="specialties">
                  {(fields, { add, remove }) => (
                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                      {fields.map((field) => (
                        <div key={field.key} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                          <Form.Item name={[field.name, 'name']} style={{ flex: 1, marginBottom: 0 }}>
                            <Input placeholder="如：普通外科" />
                          </Form.Item>
                          <Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(field.name)} />
                        </div>
                      ))}
                      <Button type="dashed" onClick={() => add({ name: '' })} icon={<PlusOutlined />}>
                        添加专业方向
                      </Button>
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
                      <Button type="dashed" onClick={() => add({ name: '' })} icon={<PlusOutlined />}>
                        添加标签
                      </Button>
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
