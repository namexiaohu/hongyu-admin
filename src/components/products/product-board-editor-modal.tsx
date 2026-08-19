'use client';

import { Button, Empty, Form, Input, Modal, Space, message } from 'antd';
import type { FormInstance } from 'antd';
import Link from 'next/link';
import { useEffect, useRef, useState, useTransition } from 'react';

import { ContentEditorLocaleTab } from '@/components/admin/content-editor-locale-tab';
import { runDefaultLocaleSaveGate } from '@/lib/admin-default-locale-save';
import { normalizeEntityKeyForSave, normalizeEntityKeyInput } from '@/lib/admin-entity-key';
import { shouldPersistLocaleDraft } from '@/lib/locale-draft-persistence';
import type {
  AdminProductBoardsDashboard,
  AdminProductCoverageBoardDetail,
  AdminProductCoverageBoardTranslation,
  ProductCoverageMetric,
} from '@/lib/product-boards';
import type { AdminSiteLanguageRow } from '@/server/admin/languages';

type LocaleFormValues = {
  name: string;
  description: string;
};

type LocaleDraft = LocaleFormValues & {
  entryId?: string;
  persisted: boolean;
};

type ProductBoardEditorModalProps = {
  open: boolean;
  activeLanguages: AdminSiteLanguageRow[];
  editingBoard: ProductCoverageMetric | null;
  existingKeys: string[];
  onClose: () => void;
  onSaved: (dashboard: AdminProductBoardsDashboard) => void;
};

function createEmptyDraft(): LocaleDraft {
  return { name: '', description: '', persisted: false };
}

function entryToDraft(entry: AdminProductCoverageBoardTranslation): LocaleDraft {
  return { entryId: entry.id, name: entry.name, description: entry.description ?? '', persisted: true };
}

function cloneDraftMap(drafts: Record<string, LocaleDraft>) {
  return Object.fromEntries(Object.entries(drafts).map(([locale, draft]) => [locale, { ...draft }]));
}

function draftChanged(baseline: LocaleDraft | undefined, draft: LocaleDraft) {
  if (!baseline?.persisted) return true;
  return draft.name !== baseline.name || draft.description !== baseline.description;
}

function mergeActiveFormIntoDrafts(
  drafts: Record<string, LocaleDraft>,
  activeLocale: string,
  form: FormInstance<LocaleFormValues>,
): Record<string, LocaleDraft> {
  if (!activeLocale) return drafts;
  const previous = drafts[activeLocale] ?? createEmptyDraft();
  const values = form.getFieldsValue(true);
  return {
    ...drafts,
    [activeLocale]: { ...previous, name: values.name ?? '', description: values.description ?? '' },
  };
}

function validateDraft(locale: string, draft: LocaleDraft) {
  if (!draft.name.trim()) return { ok: false as const, locale, message: '请输入看板名称' };
  return { ok: true as const };
}

export function ProductBoardEditorModal({
  open,
  activeLanguages,
  editingBoard,
  existingKeys,
  onClose,
  onSaved,
}: ProductBoardEditorModalProps) {
  const [form] = Form.useForm<LocaleFormValues>();
  const [messageApi, contextHolder] = message.useMessage();
  const [boardKey, setBoardKey] = useState('');
  const [activeLocale, setActiveLocale] = useState('');
  const [drafts, setDrafts] = useState<Record<string, LocaleDraft>>({});
  const [loadingGroup, setLoadingGroup] = useState(false);
  const [isPending, startTransition] = useTransition();
  const baselineDraftsRef = useRef<Record<string, LocaleDraft>>({});
  const activeLocaleRef = useRef('');

  const hasLanguages = activeLanguages.length > 0;
  const defaultLocale = activeLanguages.find((l) => l.isDefault)?.code ?? activeLanguages[0]?.code ?? '';
  const isEditing = Boolean(editingBoard);

  useEffect(() => { activeLocaleRef.current = activeLocale; }, [activeLocale]);

  useEffect(() => {
    if (!open) return;

    const nextLocale = defaultLocale;
    const seedDrafts = Object.fromEntries(activeLanguages.map((l) => [l.code, createEmptyDraft()]));

    setBoardKey(editingBoard?.key ?? '');
    setLoadingGroup(Boolean(editingBoard));
    setActiveLocale(nextLocale);
    activeLocaleRef.current = nextLocale;
    baselineDraftsRef.current = cloneDraftMap(seedDrafts);
    setDrafts(seedDrafts);
    form.resetFields();
    form.setFieldsValue(seedDrafts[nextLocale] ?? createEmptyDraft());

    if (!editingBoard) {
      setLoadingGroup(false);
      return;
    }

    void (async () => {
      try {
        const response = await fetch(`/api/admin/products/boards/${encodeURIComponent(editingBoard.key)}`);
        const payload = response.ok
          ? (await response.json()) as { item: AdminProductCoverageBoardDetail }
          : { item: null };

        const mergedDrafts = { ...seedDrafts };
        if (payload.item) {
          setBoardKey(payload.item.key);
          for (const item of payload.item.translations) {
            mergedDrafts[item.locale] = entryToDraft(item);
          }
        } else {
          mergedDrafts[nextLocale] = {
            ...createEmptyDraft(),
            name: editingBoard.title,
            description: editingBoard.note ?? '',
            persisted: true,
          };
        }

        const localeForForm = activeLocaleRef.current || nextLocale;
        baselineDraftsRef.current = cloneDraftMap(mergedDrafts);
        setDrafts(mergedDrafts);
        form.resetFields();
        form.setFieldsValue(mergedDrafts[localeForForm] ?? createEmptyDraft());
      } catch {
        void messageApi.warning('加载多语言版本失败，已回退到当前条目');
      } finally {
        setLoadingGroup(false);
      }
    })();
  }, [open, editingBoard, activeLanguages, defaultLocale, form, messageApi]);

  function loadDraft(locale: string, nextDrafts: Record<string, LocaleDraft>) {
    const draft = nextDrafts[locale] ?? createEmptyDraft();
    form.resetFields();
    form.setFieldsValue({ name: draft.name, description: draft.description });
  }

  function handleLocaleChange(nextLocale: string) {
    const merged = mergeActiveFormIntoDrafts(drafts, activeLocale, form);
    setDrafts(merged);
    loadDraft(nextLocale, merged);
    setActiveLocale(nextLocale);
  }

  function getMergedDrafts() {
    return mergeActiveFormIntoDrafts(drafts, activeLocale, form);
  }

  function persistAllLocales() {
    if (!hasLanguages) {
      void messageApi.warning('请先在「多语言管理」中添加并启用语言');
      return;
    }

    const resolvedKey = isEditing ? editingBoard?.key : normalizeEntityKeyForSave(boardKey);
    if (!resolvedKey) {
      void messageApi.error('Key 只能包含小写英文字母和连字符');
      return;
    }

    if (!isEditing && existingKeys.includes(resolvedKey)) {
      void messageApi.error('Key 已被占用');
      return;
    }

    const mergedDrafts = getMergedDrafts();
    const gate = runDefaultLocaleSaveGate({ defaultLocale, mergedDrafts, createEmptyDraft, validateDraft });
    if (!gate.ok) {
      setDrafts(mergedDrafts);
      setActiveLocale(gate.validation.locale || defaultLocale);
      loadDraft(gate.validation.locale || defaultLocale, mergedDrafts);
      void messageApi.error(gate.validation.message);
      return;
    }

    const workingDrafts = gate.mergedDrafts;
    const targets = activeLanguages
      .map((l) => ({ locale: l.code, draft: workingDrafts[l.code] ?? createEmptyDraft() }))
      .filter((t) => shouldPersistLocaleDraft({ locale: t.locale, defaultLocale, primaryText: t.draft.name }))
      .filter((t) => draftChanged(baselineDraftsRef.current[t.locale], t.draft) || !isEditing);

    if (!targets.length) {
      void messageApi.warning('没有需要保存的变更');
      return;
    }

    for (const target of targets) {
      const validation = validateDraft(target.locale, target.draft);
      if (!validation.ok) {
        setDrafts(workingDrafts);
        setActiveLocale(validation.locale);
        loadDraft(validation.locale, workingDrafts);
        const language = activeLanguages.find((l) => l.code === validation.locale);
        void messageApi.error(`${language?.nativeName ?? validation.locale}：${validation.message}`);
        return;
      }
    }

    setDrafts(workingDrafts);

    startTransition(async () => {
      const response = await fetch('/api/admin/products/boards', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: resolvedKey,
          translations: targets.map((t) => ({
            locale: t.locale,
            name: t.draft.name.trim(),
            description: t.draft.description.trim() || null,
          })),
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({})) as { message?: string };
        void messageApi.error(payload.message ?? '保存失败');
        return;
      }

      const payload = (await response.json()) as { dashboard: AdminProductBoardsDashboard };
      void messageApi.success('保存成功');
      onSaved(payload.dashboard);
      onClose();
    });
  }

  return (
    <>
      {contextHolder}
      <Modal
        open={open}
        title={isEditing ? '编辑看板' : '新增看板'}
        onCancel={onClose}
        footer={null}
        width={760}
        destroyOnHidden
        confirmLoading={isPending || loadingGroup}
        className="content-editor-modal"
        rootClassName="content-editor-modal-wrap"
        style={{ top: 48 }}
        styles={{ body: { overflow: 'visible', minWidth: 0 } }}
      >
        {!hasLanguages ? (
          <Empty description="尚未配置站点语言，请先在「多语言管理」中添加并启用语言。">
            <Link href="/admin/languages">
              <Button type="primary">前往多语言管理</Button>
            </Link>
          </Empty>
        ) : (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button type="primary" loading={isPending} onClick={() => persistAllLocales()}>
                {isEditing ? '保存' : '保存看板'}
              </Button>
            </div>

            {/* 通用区 */}
            <div className="content-editor-shared-section">
              <Form layout="vertical">
                <Form.Item
                  label="Key"
                  required
                  extra={isEditing ? '系统标识，创建后不可修改' : '只能包含小写英文字母和连字符'}
                  style={{ marginBottom: 0 }}
                >
                  <Input
                    value={boardKey}
                    placeholder="例如 seasonal-picks"
                    disabled={isEditing}
                    onChange={(e) => setBoardKey(normalizeEntityKeyInput(e.target.value))}
                  />
                </Form.Item>
              </Form>
            </div>

            {/* 多语言区 */}
            <div className="content-editor-layout">
              <div className="content-editor-locale-nav">
                {activeLanguages.map((language) => (
                  <ContentEditorLocaleTab
                    key={language.code}
                    language={language}
                    isActive={language.code === activeLocale}
                    persisted={drafts[language.code]?.persisted}
                    onClick={() => handleLocaleChange(language.code)}
                  />
                ))}
              </div>
              <div className="content-editor-main">
                <Form form={form} layout="vertical" preserve={false}>
                  <div className="content-editor-section-toolbar content-editor-section-toolbar--faq">
                    <div className="feature-definition-editor-content__title">内容</div>
                  </div>
                  <Form.Item
                    label="看板名称"
                    name="name"
                    rules={[{ required: true, message: '请输入看板名称' }]}
                  >
                    <Input />
                  </Form.Item>
                  <Form.Item label="说明" name="description">
                    <Input.TextArea rows={3} />
                  </Form.Item>
                </Form>
              </div>
            </div>
          </Space>
        )}
      </Modal>
    </>
  );
}
