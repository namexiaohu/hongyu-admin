'use client';

import { Space, message } from 'antd';
import { useEffect, useState, useTransition } from 'react';

import {
  ListHeroBoardFields,
  listHeroBoardFromFormValues,
} from '@/components/website-config/list-hero-board-fields';
import { NavColumnsEditor } from '@/components/website-config/nav-columns-editor';
import { CommercePageHeader } from '@/components/commerce/commerce-page-header';
import {
  type AdminWebsiteConfig,
  type NavColumn,
  compactNavColumns,
} from '@/lib/website-config';
import {
  listHeroBoardKeys,
  type AdminListHeroBoardsRecord,
  type ListHeroBoardKey,
} from '@/lib/list-hero-board';
import type { AdminSiteLanguageRow } from '@/server/admin/languages';

type Props = {
  initialConfig: AdminWebsiteConfig;
  activeLanguages: AdminSiteLanguageRow[];
};

export function WebsiteConfigEditor({ initialConfig, activeLanguages }: Props) {
  const [headerNavColumns, setHeaderNavColumns] = useState<NavColumn[]>(
    () => compactNavColumns(initialConfig.headerNavColumns),
  );
  const [footerNavColumns, setFooterNavColumns] = useState<NavColumn[]>(
    () => compactNavColumns(initialConfig.footerNavColumns),
  );
  const [listHeroBoards, setListHeroBoards] = useState<AdminListHeroBoardsRecord>(initialConfig.listHeroBoards);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setHeaderNavColumns(compactNavColumns(initialConfig.headerNavColumns));
    setFooterNavColumns(compactNavColumns(initialConfig.footerNavColumns));
    setListHeroBoards(initialConfig.listHeroBoards);
  }, [initialConfig]);

  function updateListHeroBoard(key: ListHeroBoardKey, patch: ReturnType<typeof listHeroBoardFromFormValues>) {
    setListHeroBoards((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        ...patch,
      },
    }));
  }

  function handleSave() {
    startTransition(async () => {
      try {
        setStatusMessage(null);
        const response = await fetch('/api/admin/website-config', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            headerNavColumns,
            footerNavColumns,
            listHeroBoards: Object.fromEntries(
              listHeroBoardKeys.map((key) => {
                const board = listHeroBoards[key];
                return [key, {
                  coverMode: board.coverMode,
                  coverValue: board.coverValue,
                  videoUrl: board.videoUrl,
                  showCoverOnBackground: board.showCoverOnBackground,
                  coverDisplay: board.coverDisplay,
                  heroCopyStyle: board.heroCopyStyle,
                  backgroundFitMode: board.backgroundFitMode,
                  backgroundMode: board.backgroundMode,
                  backgroundValue: board.backgroundValue,
                }];
              }),
            ),
          }),
        });
        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.message || '保存失败');
        }
        const updated = await response.json() as AdminWebsiteConfig;
        setHeaderNavColumns(compactNavColumns(updated.headerNavColumns));
        setFooterNavColumns(compactNavColumns(updated.footerNavColumns));
        setListHeroBoards(updated.listHeroBoards);
        setStatusMessage('网站配置已保存');
        message.success('网站配置已保存');
      } catch (error) {
        const text = error instanceof Error ? error.message : '保存失败';
        setStatusMessage(text.includes('失败') ? text : `${text}失败`);
        message.error(text);
      }
    });
  }

  return (
    <Space orientation="vertical" size="large" style={{ width: '100%' }}>
      <CommercePageHeader
        title="网站配置"
        description="维护头部/底部导航栏目与条目，以及列表页看板媒体配置，保存后前台同步生效。"
        statusMessage={statusMessage}
        isPending={isPending}
        onSave={handleSave}
      />

      <NavColumnsEditor
        title="头部导航"
        description="显示在网站顶部主导航区域。"
        columns={headerNavColumns}
        onChange={setHeaderNavColumns}
        activeLanguages={activeLanguages}
      />

      <NavColumnsEditor
        title="底部导航"
        description="显示在网站页脚链接区域，可与头部导航独立维护。"
        columns={footerNavColumns}
        onChange={setFooterNavColumns}
        activeLanguages={activeLanguages}
      />

      {listHeroBoardKeys.map((boardKey) => (
        <ListHeroBoardFields
          key={boardKey}
          boardKey={boardKey}
          value={listHeroBoards[boardKey]}
          onChange={(next) => updateListHeroBoard(boardKey, next)}
        />
      ))}
    </Space>
  );
}
