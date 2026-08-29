'use client';

import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { Button, Card, Form, InputNumber, Space, Table, Tabs, Typography, message } from 'antd';
import Link from 'next/link';
import { useEffect, useMemo, useState, useTransition } from 'react';

import { ContentEditorLocaleTab } from '@/components/admin/content-editor-locale-tab';
import type { AdminAcademyQuestionBankDetail, AdminAcademyQuestionBankListItem } from '@/lib/academy-question-bank-content';
import type { AdminAcademyQuestionListItem } from '@/lib/academy-question-content';
import { academyQuestionTypeLabels } from '@/lib/academy-question-content';
import { shouldPersistLocaleDraft } from '@/lib/locale-draft-persistence';
import type { AdminSiteLanguageRow } from '@/server/admin/languages';

type Props = {
  bankId: string;
  initialDetail: AdminAcademyQuestionBankDetail;
  activeLanguages: AdminSiteLanguageRow[];
};

type LocaleDraft = { title: string };

function emptyDraft(): LocaleDraft {
  return { title: '' };
}

function buildDrafts(detail: AdminAcademyQuestionBankDetail, languages: AdminSiteLanguageRow[]) {
  const drafts: Record<string, LocaleDraft> = {};
  for (const language of languages) {
    const translation = detail.translations.find((item) => item.locale === language.code);
    drafts[language.code] = translation ? { title: translation.title } : emptyDraft();
  }
  return drafts;
}

export function QuestionBankEditorClient({ bankId, initialDetail, activeLanguages }: Props) {
  const [detail, setDetail] = useState(initialDetail);
  const [questions, setQuestions] = useState<AdminAcademyQuestionListItem[]>([]);
  const [settingsForm] = Form.useForm<{ timeLimitMinutes: number | null; maxRetakes: number | null; passScorePercent: number }>();
  const [activeLocale, setActiveLocale] = useState(activeLanguages[0]?.code ?? 'en');
  const [drafts, setDrafts] = useState<Record<string, LocaleDraft>>({});
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [isPending, startTransition] = useTransition();

  const defaultLocale = activeLanguages.find((item) => item.isDefault)?.code ?? activeLanguages[0]?.code ?? 'en';
  const currentDraft = useMemo(() => drafts[activeLocale] ?? emptyDraft(), [drafts, activeLocale]);

  useEffect(() => {
    setDrafts(buildDrafts(detail, activeLanguages));
    setActiveLocale(defaultLocale);
    settingsForm.setFieldsValue({
      timeLimitMinutes: detail.timeLimitMinutes,
      maxRetakes: detail.maxRetakes,
      passScorePercent: detail.passScorePercent,
    });
  }, [detail, activeLanguages, defaultLocale, settingsForm]);

  useEffect(() => {
    setLoadingQuestions(true);
    void fetch(`/api/admin/academy/question-banks/${bankId}/questions`)
      .then((response) => response.json())
      .then((payload: { items: AdminAcademyQuestionListItem[] }) => setQuestions(payload.items ?? []))
      .finally(() => setLoadingQuestions(false));
  }, [bankId]);

  function updateDraft(patch: Partial<LocaleDraft>) {
    setDrafts((current) => ({
      ...current,
      [activeLocale]: { ...(current[activeLocale] ?? emptyDraft()), ...patch },
    }));
  }

  async function saveAll() {
    const settings = await settingsForm.validateFields();
    const defaultTitle = (drafts[defaultLocale]?.title ?? '').trim();
    if (!defaultTitle) {
      message.error('请填写默认语言标题');
      return;
    }

    const patchResponse = await fetch(`/api/admin/academy/question-banks/${bankId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        timeLimitMinutes: settings.timeLimitMinutes ?? null,
        maxRetakes: settings.maxRetakes ?? null,
        passScorePercent: settings.passScorePercent,
      }),
    });
    if (!patchResponse.ok) throw new Error('保存设置失败');

    for (const language of activeLanguages) {
      const draft = drafts[language.code] ?? emptyDraft();
      if (!shouldPersistLocaleDraft({ locale: language.code, defaultLocale, primaryText: draft.title })) continue;
      const response = await fetch(`/api/admin/academy/question-banks/${bankId}/translations`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale: language.code, title: draft.title }),
      });
      if (!response.ok) throw new Error(`保存 ${language.code} 失败`);
    }

    const detailResponse = await fetch(`/api/admin/academy/question-banks/${bankId}`);
    if (!detailResponse.ok) throw new Error('刷新失败');
    const saved = (await detailResponse.json()) as AdminAcademyQuestionBankDetail;
    setDetail(saved);
    message.success('题库已保存');
  }

  async function reorder(ids: string[]) {
    const response = await fetch(`/api/admin/academy/question-banks/${bankId}/questions`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });
    if (!response.ok) throw new Error('排序失败');
    const payload = (await response.json()) as { items: AdminAcademyQuestionListItem[] };
    setQuestions(payload.items);
  }

  function moveQuestion(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= questions.length) return;
    const next = [...questions];
    const [row] = next.splice(index, 1);
    next.splice(nextIndex, 0, row);
    setQuestions(next);
    void reorder(next.map((item) => item.id)).catch(() => {
      message.error('排序失败');
    });
  }

  function deleteQuestion(record: AdminAcademyQuestionListItem) {
    void (async () => {
      const response = await fetch(`/api/admin/academy/questions/${record.id}`, { method: 'DELETE' });
      if (!response.ok) {
        message.error('删除失败');
        return;
      }
      setQuestions((current) => current.filter((item) => item.id !== record.id));
      message.success('已删除');
    })();
  }

  function createQuestion() {
    startTransition(async () => {
      try {
        const response = await fetch(`/api/admin/academy/question-banks/${bankId}/questions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            questionType: 'single_choice',
            score: 1,
            translation: {
              locale: defaultLocale,
              content: { prompt: 'New question', options: ['Option A', 'Option B'], correctAnswerIndex: 0 },
            },
          }),
        });
        if (!response.ok) throw new Error('创建失败');
        const created = (await response.json()) as AdminAcademyQuestionListItem;
        window.location.href = `/admin/academy/question-banks/${bankId}/questions/${created.id}`;
      } catch (error) {
        message.error(error instanceof Error ? error.message : '创建失败');
      }
    });
  }

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography.Title level={4} style={{ margin: 0 }}>编辑题库</Typography.Title>
        <Space>
          <Link href="/admin/academy/question-banks">返回列表</Link>
          <Button type="primary" loading={isPending} onClick={() => startTransition(() => void saveAll().catch((e) => message.error(e instanceof Error ? e.message : '保存失败')))}>
            保存
          </Button>
        </Space>
      </div>

      <Card title="考试设置">
        <Form form={settingsForm} layout="vertical">
          <Space wrap size="large">
            <Form.Item name="timeLimitMinutes" label="考试限时时长（分钟，留空不限）">
              <InputNumber min={1} placeholder="不限" style={{ width: 160 }} />
            </Form.Item>
            <Form.Item name="maxRetakes" label="允许重考次数（留空不限）">
              <InputNumber min={0} placeholder="不限" style={{ width: 160 }} />
            </Form.Item>
            <Form.Item name="passScorePercent" label="及格线 (%)" rules={[{ required: true }]}>
              <InputNumber min={1} max={100} addonAfter="%" style={{ width: 160 }} />
            </Form.Item>
          </Space>
        </Form>
      </Card>

      <Card title="多语言标题">
        <div className="content-editor-layout">
          <div className="content-editor-locale-nav">
            {activeLanguages.map((language) => (
              <ContentEditorLocaleTab
                key={language.code}
                language={language}
                isActive={activeLocale === language.code}
                persisted={Boolean(detail.translations.find((item) => item.locale === language.code)?.title?.trim())}
                onClick={() => setActiveLocale(language.code)}
              />
            ))}
          </div>
          <div className="content-editor-main">
            <Form layout="vertical">
              <Form.Item label="标题" required={activeLocale === defaultLocale}>
                <input
                  className="ant-input"
                  value={currentDraft.title}
                  onChange={(event) => updateDraft({ title: event.target.value })}
                />
              </Form.Item>
            </Form>
          </div>
        </div>
      </Card>

      <Card
        title="题目列表"
        extra={(
          <Button type="primary" icon={<PlusOutlined />} loading={isPending} onClick={createQuestion}>
            添加题目
          </Button>
        )}
      >
        <Table
          rowKey="id"
          loading={loadingQuestions}
          dataSource={questions}
          pagination={false}
          columns={[
            { title: '#', width: 48, render: (_: unknown, __: AdminAcademyQuestionListItem, index: number) => index + 1 },
            { title: '题型', dataIndex: 'questionType', width: 100, render: (v: keyof typeof academyQuestionTypeLabels) => academyQuestionTypeLabels[v] },
            { title: '分数', dataIndex: 'score', width: 72 },
            { title: '摘要', dataIndex: 'summary', ellipsis: true },
            {
              title: '操作',
              width: 220,
              render: (_: unknown, record: AdminAcademyQuestionListItem, index: number) => (
                <Space>
                  <Button type="link" icon={<ArrowUpOutlined />} disabled={index === 0} onClick={() => moveQuestion(index, -1)} />
                  <Button type="link" icon={<ArrowDownOutlined />} disabled={index === questions.length - 1} onClick={() => moveQuestion(index, 1)} />
                  <Link href={`/admin/academy/question-banks/${bankId}/questions/${record.id}`}>
                    <Button type="link" icon={<EditOutlined />}>编辑</Button>
                  </Link>
                  <Button type="link" danger icon={<DeleteOutlined />} onClick={() => deleteQuestion(record)}>删除</Button>
                </Space>
              ),
            },
          ]}
        />
      </Card>
    </Space>
  );
}
