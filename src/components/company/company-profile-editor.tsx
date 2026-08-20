'use client';

import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Form, Input, Space, Tabs, message } from 'antd';
import { useEffect, useMemo, useState, useTransition } from 'react';

import { ContentEditorLocaleTab } from '@/components/admin/content-editor-locale-tab';
import { ContentTranslateButton } from '@/components/admin/content-translate-button';
import { CommercePageHeader } from '@/components/commerce/commerce-page-header';
import { CompanyPublicFilesField } from '@/components/company/company-public-files-field';
import { CoverImageField } from '@/components/editorial/cover-image-field';
import { applyNonemptyTranslatedFields } from '@/lib/content-translate-config';
import {
  deserializeOffices,
  deserializePairRows,
  deserializeTeamMembers,
  serializeOffices,
  serializePairRows,
  serializeTeamMembers,
} from '@/lib/content-translate-serialize';
import {
  type AdminCompanyProfile,
  type CompanyLabelValue,
  type CompanyOffice,
  type CompanyPublicFile,
  type CompanyTeamMember,
  translationHasContent,
} from '@/lib/company-profile';
import { shouldPersistLocaleDraft } from '@/lib/locale-draft-persistence';
import type { AdminSiteLanguageRow } from '@/server/admin/languages';

type SectionTabKey = 'content' | 'contact' | 'basic' | 'team' | 'offices';

type SharedFormValues = {
  companyEmail: string;
  businessEmail: string;
  website: string;
  icpNumber: string;
  publicFiles: CompanyPublicFile[];
};

type LocaleDraft = {
  companyName: string;
  slogan: string;
  positioning: string;
  copyright: string;
  contactPhone: string;
  address: string;
  businessHours: string;
  businessHotline: string;
  basicInfo: CompanyLabelValue[];
  executives: CompanyTeamMember[];
  managers: CompanyTeamMember[];
  offices: CompanyOffice[];
};

function emptyDraft(): LocaleDraft {
  return {
    companyName: '',
    slogan: '',
    positioning: '',
    copyright: '',
    contactPhone: '',
    address: '',
    businessHours: '',
    businessHotline: '',
    basicInfo: [],
    executives: [],
    managers: [],
    offices: [],
  };
}

function translationToDraft(translation?: AdminCompanyProfile['translations'][number]): LocaleDraft {
  if (!translation) return emptyDraft();
  return {
    companyName: translation.companyName,
    slogan: translation.slogan,
    positioning: translation.positioning,
    copyright: translation.copyright,
    contactPhone: translation.contactPhone,
    address: translation.address,
    businessHours: translation.businessHours,
    businessHotline: translation.businessHotline,
    basicInfo: translation.basicInfo.length ? translation.basicInfo : [],
    executives: translation.executives.length ? translation.executives : [],
    managers: translation.managers.length ? translation.managers : [],
    offices: translation.offices.length ? translation.offices : [],
  };
}

function readLocaleForm(values: Partial<LocaleDraft>): LocaleDraft {
  return {
    companyName: values.companyName ?? '',
    slogan: values.slogan ?? '',
    positioning: values.positioning ?? '',
    copyright: values.copyright ?? '',
    contactPhone: values.contactPhone ?? '',
    address: values.address ?? '',
    businessHours: values.businessHours ?? '',
    businessHotline: values.businessHotline ?? '',
    basicInfo: values.basicInfo ?? [],
    executives: values.executives ?? [],
    managers: values.managers ?? [],
    offices: values.offices ?? [],
  };
}

type CompanyProfileEditorProps = {
  initialProfile: AdminCompanyProfile;
  activeLanguages: AdminSiteLanguageRow[];
};

export function CompanyProfileEditor({ initialProfile, activeLanguages }: CompanyProfileEditorProps) {
  const [sharedForm] = Form.useForm<SharedFormValues>();
  const [form] = Form.useForm<LocaleDraft>();
  const [profile, setProfile] = useState(initialProfile);
  const [activeLocale, setActiveLocale] = useState(activeLanguages.find((item) => item.isDefault)?.code ?? activeLanguages[0]?.code ?? '');
  const [sectionTab, setSectionTab] = useState<SectionTabKey>('content');
  const [drafts, setDrafts] = useState<Record<string, LocaleDraft>>({});
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const defaultLocale = activeLanguages.find((language) => language.isDefault)?.code ?? activeLanguages[0]?.code ?? '';

  const translationByLocale = useMemo(() => {
    const map = new Map<string, AdminCompanyProfile['translations'][number]>();
    profile.translations.forEach((translation) => map.set(translation.locale, translation));
    return map;
  }, [profile]);

  useEffect(() => {
    sharedForm.setFieldsValue({
      companyEmail: profile.companyEmail,
      businessEmail: profile.businessEmail,
      website: profile.website,
      icpNumber: profile.icpNumber,
      publicFiles: profile.publicFiles,
    });
    const nextDrafts: Record<string, LocaleDraft> = {};
    activeLanguages.forEach((language) => {
      nextDrafts[language.code] = translationToDraft(translationByLocale.get(language.code));
    });
    setDrafts(nextDrafts);
    const locale = activeLanguages.find((item) => item.isDefault)?.code ?? activeLanguages[0]?.code ?? '';
    setActiveLocale(locale);
    form.setFieldsValue(nextDrafts[locale] ?? emptyDraft());
  }, [profile, activeLanguages, form, sharedForm, translationByLocale]);

  function mergeActiveFormIntoDrafts(current: Record<string, LocaleDraft>, locale: string) {
    return { ...current, [locale]: readLocaleForm(form.getFieldsValue()) };
  }

  function getMergedDrafts() {
    return mergeActiveFormIntoDrafts(drafts, activeLocale);
  }

  function getDefaultSourceFields(): Record<string, string> {
    const draft = getMergedDrafts()[defaultLocale] ?? emptyDraft();
    return {
      companyName: draft.companyName,
      slogan: draft.slogan,
      positioning: draft.positioning,
      copyright: draft.copyright,
      contactPhone: draft.contactPhone,
      address: draft.address,
      businessHours: draft.businessHours,
      businessHotline: draft.businessHotline,
      basicInfoText: serializePairRows(draft.basicInfo),
      executivesText: serializeTeamMembers(draft.executives),
      managersText: serializeTeamMembers(draft.managers),
      officesText: serializeOffices(draft.offices),
    };
  }

  function hasTargetLocaleContent() {
    const draft = getMergedDrafts()[activeLocale] ?? emptyDraft();
    return translationHasContent(draft);
  }

  function handleTranslated(fields: Record<string, string>) {
    const merged = getMergedDrafts();
    const current = merged[activeLocale] ?? emptyDraft();
    const source = merged[defaultLocale] ?? emptyDraft();
    const {
      basicInfoText,
      executivesText,
      managersText,
      officesText,
      ...plainFields
    } = fields;
    const nextDraft = applyNonemptyTranslatedFields(current, plainFields);
    const basicInfo = deserializePairRows(basicInfoText ?? '');
    if (basicInfo.length) nextDraft.basicInfo = basicInfo;
    const executives = deserializeTeamMembers(executivesText ?? '');
    if (executives.length) nextDraft.executives = executives;
    const managers = deserializeTeamMembers(managersText ?? '');
    if (managers.length) nextDraft.managers = managers;
    const offices = deserializeOffices(officesText ?? '', source.offices);
    nextDraft.offices = offices;
    const nextDrafts = { ...merged, [activeLocale]: nextDraft };
    setDrafts(nextDrafts);
    form.setFieldsValue(nextDraft);
  }

  function switchLocale(nextLocale: string) {
    if (nextLocale === activeLocale) return;
    const merged = mergeActiveFormIntoDrafts(drafts, activeLocale);
    setDrafts(merged);
    setActiveLocale(nextLocale);
    form.setFieldsValue(merged[nextLocale] ?? emptyDraft());
  }

  function handleSave() {
    startTransition(async () => {
      setStatusMessage(null);
      try {
        const shared = await sharedForm.validateFields();
        const merged = mergeActiveFormIntoDrafts(drafts, activeLocale);
        setDrafts(merged);

        const translations = activeLanguages
          .map((language) => ({
            locale: language.code,
            ...(merged[language.code] ?? emptyDraft()),
          }))
          .filter((item) => shouldPersistLocaleDraft({
            locale: item.locale,
            defaultLocale,
            primaryText: item.companyName,
          }) || (item.locale !== defaultLocale && translationHasContent(item)));

        const response = await fetch('/api/admin/company', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companyEmail: shared.companyEmail ?? '',
            businessEmail: shared.businessEmail ?? '',
            website: shared.website ?? '',
            icpNumber: shared.icpNumber ?? '',
            publicFiles: shared.publicFiles ?? [],
            translations,
          }),
        });
        if (!response.ok) {
          const errorBody = await response.json().catch(() => null);
          throw new Error(errorBody?.message ?? '保存失败');
        }
        const updated = (await response.json()) as AdminCompanyProfile;
        setProfile(updated);
        setStatusMessage('保存成功');
        message.success('企业信息已保存');
      } catch (error) {
        const text = error instanceof Error ? error.message : '保存失败';
        setStatusMessage(`保存失败：${text}`);
        message.error(text);
      }
    });
  }

  return (
    <Space orientation="vertical" size="large" style={{ width: '100%' }}>
      <CommercePageHeader
        title="企业信息"
        description="维护公司邮箱、公开文件与多语言企业资料，前台 /company 将直接展示。"
        statusMessage={statusMessage}
        isPending={isPending}
        onSave={handleSave}
      />

      <div className="content-editor-shared-section">
        <Form form={sharedForm} layout="vertical">
          <Form.Item name="companyEmail" label="公司邮箱">
            <Input placeholder="info@hongyuvet.com" />
          </Form.Item>
          <Form.Item name="businessEmail" label="商务邮箱">
            <Input placeholder="business@hongyuvet.com" />
          </Form.Item>
          <Form.Item name="website" label="官网">
            <Input placeholder="https://" />
          </Form.Item>
          <Form.Item name="icpNumber" label="备案号">
            <Input placeholder="沪 ICP 备 XXXXXXXX 号" />
          </Form.Item>
          <Form.Item name="publicFiles" label="公开文件" getValueFromEvent={(value: CompanyPublicFile[]) => value ?? []}>
            <CompanyPublicFilesField />
          </Form.Item>
        </Form>
      </div>

      <Form form={form} layout="vertical" preserve>
        <div className="content-editor-layout">
          <div className="content-editor-locale-nav">
            {activeLanguages.map((language) => (
              <ContentEditorLocaleTab
                key={language.code}
                language={language}
                isActive={language.code === activeLocale}
                persisted={translationByLocale.has(language.code)}
                onClick={() => switchLocale(language.code)}
              />
            ))}
          </div>
          <div className="content-editor-main">
            <div className="content-editor-section-toolbar">
              <Tabs
                activeKey={sectionTab}
                onChange={(key) => setSectionTab(key as SectionTabKey)}
                className="content-editor-section-tabs"
                items={[
                  { key: 'content', label: '内容' },
                  { key: 'contact', label: '联系方式' },
                  { key: 'basic', label: '基本信息' },
                  { key: 'team', label: '管理团队' },
                  { key: 'offices', label: '办公地点' },
                ]}
              />
              <ContentTranslateButton
                contentType="companyProfile"
                defaultLocale={defaultLocale}
                activeLocale={activeLocale}
                disabled={isPending}
                getDefaultSourceFields={getDefaultSourceFields}
                hasDefaultPersisted={() => translationByLocale.has(defaultLocale)}
                hasTargetContent={hasTargetLocaleContent}
                onTranslated={handleTranslated}
              />
            </div>

            <div style={{ display: sectionTab === 'content' ? 'block' : 'none' }}>
              <Form.Item name="companyName" label="企业名称">
                <Input placeholder="上海竑宇医疗器械有限公司" />
              </Form.Item>
              <Form.Item name="slogan" label="Slogan">
                <Input placeholder="企业口号" />
              </Form.Item>
              <Form.Item name="positioning" label="企业定位">
                <Input.TextArea rows={3} placeholder="一句话描述企业定位" />
              </Form.Item>
              <Form.Item name="copyright" label="Copyright">
                <Input placeholder="© 2026 HONGYU Medical. All rights reserved." />
              </Form.Item>
            </div>

            <div style={{ display: sectionTab === 'contact' ? 'block' : 'none' }}>
              <Form.Item name="contactPhone" label="联系方式">
                <Input placeholder="+86 21 XXXX XXXX（工作日 9:00–18:00）" />
              </Form.Item>
              <Form.Item name="address" label="地址">
                <Input.TextArea rows={2} placeholder="总部地址" />
              </Form.Item>
              <Form.Item name="businessHours" label="工作时间">
                <Input placeholder="周一至周五 9:00–18:00（北京时间）" />
              </Form.Item>
              <Form.Item name="businessHotline" label="商务热线">
                <Input placeholder="+86 400 XXX XXXX" />
              </Form.Item>
            </div>

            <div style={{ display: sectionTab === 'basic' ? 'block' : 'none' }}>
              <Form.List name="basicInfo">
                {(fields, { add, remove }) => (
                  <Space orientation="vertical" size="small" style={{ width: '100%' }}>
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
                    <Button type="dashed" onClick={() => add()} icon={<PlusOutlined />}>
                      添加信息
                    </Button>
                  </Space>
                )}
              </Form.List>
            </div>

            <div style={{ display: sectionTab === 'team' ? 'block' : 'none' }}>
              <Space orientation="vertical" size="large" style={{ width: '100%' }}>
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 8 }}>高层</div>
                  <Form.List name="executives">
                    {(fields, { add, remove }) => (
                      <Space orientation="vertical" size="small" style={{ width: '100%' }}>
                        {fields.map((field) => (
                          <div key={field.key} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                            <Form.Item name={[field.name, 'title']} style={{ flex: 1, marginBottom: 0 }}>
                              <Input placeholder="职位" />
                            </Form.Item>
                            <Form.Item name={[field.name, 'name']} style={{ flex: 1, marginBottom: 0 }}>
                              <Input placeholder="姓名" />
                            </Form.Item>
                            <Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(field.name)} />
                          </div>
                        ))}
                        <Button type="dashed" onClick={() => add()} icon={<PlusOutlined />}>
                          添加高层
                        </Button>
                      </Space>
                    )}
                  </Form.List>
                </div>
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 8 }}>中层</div>
                  <Form.List name="managers">
                    {(fields, { add, remove }) => (
                      <Space orientation="vertical" size="small" style={{ width: '100%' }}>
                        {fields.map((field) => (
                          <div key={field.key} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                            <Form.Item name={[field.name, 'title']} style={{ flex: 1, marginBottom: 0 }}>
                              <Input placeholder="职位" />
                            </Form.Item>
                            <Form.Item name={[field.name, 'name']} style={{ flex: 1, marginBottom: 0 }}>
                              <Input placeholder="姓名" />
                            </Form.Item>
                            <Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(field.name)} />
                          </div>
                        ))}
                        <Button type="dashed" onClick={() => add()} icon={<PlusOutlined />}>
                          添加中层
                        </Button>
                      </Space>
                    )}
                  </Form.List>
                </div>
              </Space>
            </div>

            <div style={{ display: sectionTab === 'offices' ? 'block' : 'none' }}>
              <Form.List name="offices">
                {(fields, { add, remove }) => (
                  <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
                    {fields.map((field) => (
                      <div
                        key={field.key}
                        style={{
                          padding: 16,
                          border: '1px solid #f0f0f0',
                          borderRadius: 8,
                          background: '#fff',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                          <strong>办公地点</strong>
                          <Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(field.name)}>
                            删除
                          </Button>
                        </div>
                        <Form.Item
                          name={[field.name, 'coverImage']}
                          label="封面图"
                          getValueFromEvent={(value: string | null) => value ?? ''}
                        >
                          <CoverImageField folder="company/offices" />
                        </Form.Item>
                        <Form.Item name={[field.name, 'name']} label="名称">
                          <Input placeholder="上海总部" />
                        </Form.Item>
                        <Form.Item name={[field.name, 'location']} label="地理位置">
                          <Input placeholder="上海市浦东新区…" />
                        </Form.Item>
                        <Form.Item name={[field.name, 'phone']} label="联系方式">
                          <Input placeholder="+86 21 XXXX XXXX" />
                        </Form.Item>
                        <Form.Item name={[field.name, 'contactPerson']} label="联系人">
                          <Input placeholder="姓名" />
                        </Form.Item>
                        <Form.Item name={[field.name, 'email']} label="电子邮箱">
                          <Input placeholder="office@example.com" />
                        </Form.Item>
                      </div>
                    ))}
                    <Button type="dashed" onClick={() => add()} icon={<PlusOutlined />}>
                      添加办公地点
                    </Button>
                  </Space>
                )}
              </Form.List>
            </div>
          </div>
        </div>
      </Form>
    </Space>
  );
}
