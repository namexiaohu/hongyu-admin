'use client';

import { Checkbox, Form, Switch, Typography } from 'antd';
import { useEffect } from 'react';

import {
  PartnerCenterBackgroundField,
  type PartnerCenterBackgroundValue,
} from '@/components/partner-centers/partner-center-background-field';
import { CoverOptionField, type CoverOptionValue } from '@/components/shared/cover-option-field';
import { HeroBackgroundFitField } from '@/components/shared/hero-background-fit-field';
import { HeroCopyStyleField } from '@/components/shared/hero-copy-style-field';
import { ProductVideoField } from '@/components/products/product-video-field';
import { defaultAdminHeroCopyStyle, resolveStorefrontHeroCopyStyle, type HeroCopyStyle } from '@/lib/hero-copy-style';
import { defaultHeroBackgroundFitMode, resolveStorefrontHeroBackgroundFitMode, type HeroBackgroundFitMode } from '@/lib/hero-background-fit';
import {
  LIST_HERO_COVER_DISPLAY_OPTIONS,
  listHeroCoverDisplayFromCheckedValues,
  listHeroCoverDisplayToCheckedValues,
  type ListHeroCoverDisplayKey,
} from '@/lib/list-hero-cover-display';
import type { AdminListHeroBoard, ListHeroBoardKey } from '@/lib/list-hero-board';

export type ListHeroBoardFormValues = {
  cover: CoverOptionValue;
  videoUrl: string;
  showCoverOnBackground: boolean;
  coverDisplay: ListHeroCoverDisplayKey[];
  heroCopyStyle: HeroCopyStyle;
  backgroundFitMode: HeroBackgroundFitMode;
  background: PartnerCenterBackgroundValue;
};

const boardLabels: Record<ListHeroBoardKey, string> = {
  solutions: '解决方案列表',
  insights: '前沿资讯列表',
  surgeons: '认证术者列表',
  centers: '合作中心列表',
};

export function listHeroBoardToFormValues(board: AdminListHeroBoard): ListHeroBoardFormValues {
  return {
    cover: {
      mode: (board.coverMode || '') as CoverOptionValue['mode'],
      value: board.coverValue ?? '',
      previewUrl: board.coverPreviewUrl ?? '',
    },
    videoUrl: board.videoUrl ?? '',
    showCoverOnBackground: Boolean(board.showCoverOnBackground),
    coverDisplay: listHeroCoverDisplayToCheckedValues(board.coverDisplay),
    heroCopyStyle: resolveStorefrontHeroCopyStyle(board.heroCopyStyle),
    backgroundFitMode: resolveStorefrontHeroBackgroundFitMode(board.backgroundFitMode),
    background: {
      mode: (board.backgroundMode || '') as PartnerCenterBackgroundValue['mode'],
      value: board.backgroundValue ?? '',
      previewUrl: board.backgroundPreviewUrl ?? '',
    },
  };
}

export function listHeroBoardFromFormValues(values: ListHeroBoardFormValues) {
  return {
    coverMode: values.cover?.mode ?? '',
    coverValue: values.cover?.value ?? '',
    videoUrl: values.videoUrl ?? '',
    showCoverOnBackground: Boolean(values.showCoverOnBackground),
    coverDisplay: listHeroCoverDisplayFromCheckedValues(values.coverDisplay),
    heroCopyStyle: values.heroCopyStyle,
    backgroundFitMode: values.backgroundFitMode,
    backgroundMode: values.background?.mode ?? '',
    backgroundValue: values.background?.value ?? '',
  };
}

type Props = {
  boardKey: ListHeroBoardKey;
  value: AdminListHeroBoard;
  onChange: (next: ReturnType<typeof listHeroBoardFromFormValues>) => void;
};

export function ListHeroBoardFields({ boardKey, value, onChange }: Props) {
  const [form] = Form.useForm<ListHeroBoardFormValues>();

  useEffect(() => {
    form.setFieldsValue(listHeroBoardToFormValues(value));
  }, [form, value]);

  return (
    <div className="content-editor-shared-section">
      <Typography.Text strong style={{ display: 'block', marginBottom: 12 }}>
        {boardLabels[boardKey]}
      </Typography.Text>
      <Form
        form={form}
        layout="vertical"
        initialValues={listHeroBoardToFormValues(value)}
        onValuesChange={(_, allValues) => onChange(listHeroBoardFromFormValues(allValues))}
      >
        <Form.Item name="cover" label="封面图（各语言共用）">
          <CoverOptionField />
        </Form.Item>
        <Form.Item name="videoUrl" label="视频">
          <ProductVideoField folder={`website-config/${boardKey}/videos`} />
        </Form.Item>
        <Form.Item
          name="showCoverOnBackground"
          label="大背景图同时显示封面"
          valuePropName="checked"
        >
          <Switch checkedChildren="开" unCheckedChildren="关" />
        </Form.Item>
        <Form.Item
          name="coverDisplay"
          label="封面显示"
          initialValue={['video', 'cover']}
          extra="控制看板右侧封面区块显示内容；按勾选过滤，顺序：视频 → 封面 → 轮播图（三个列表页暂无轮播图）。某项勾选且有素材才显示；全部不勾选则不显示右侧封面区"
        >
          <Checkbox.Group options={LIST_HERO_COVER_DISPLAY_OPTIONS} />
        </Form.Item>
        <Form.Item name="heroCopyStyle" label="看板文案风格" initialValue={defaultAdminHeroCopyStyle()}>
          <HeroCopyStyleField />
        </Form.Item>
        <Form.Item name="backgroundFitMode" label="大背景图显示效果" initialValue={defaultHeroBackgroundFitMode()}>
          <HeroBackgroundFitField />
        </Form.Item>
        <Form.Item name="background" label="大背景图（各语言共用）">
          <PartnerCenterBackgroundField />
        </Form.Item>
      </Form>
    </div>
  );
}
