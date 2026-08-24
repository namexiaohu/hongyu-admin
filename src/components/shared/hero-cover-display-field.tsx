'use client';

import { Checkbox } from 'antd';

import {
  HERO_COVER_DISPLAY_OPTIONS_NO_GALLERY,
  HERO_COVER_DISPLAY_OPTIONS_WITH_GALLERY,
  heroCoverDisplayFromCheckedValues,
  heroCoverDisplayToCheckedValues,
  type HeroCoverDisplay,
  type HeroCoverDisplayKey,
} from '@/lib/hero-cover-display';

type Props = {
  value?: HeroCoverDisplay | null;
  onChange?: (value: HeroCoverDisplay) => void;
  /** When false, hide gallery checkbox (summit / list-style). Default true. */
  includeGallery?: boolean;
  disabled?: boolean;
};

export function HeroCoverDisplayField({
  value,
  onChange,
  includeGallery = true,
  disabled = false,
}: Props) {
  const display: HeroCoverDisplay = value ?? {
    video: true,
    cover: true,
    gallery: includeGallery,
  };
  const checked = heroCoverDisplayToCheckedValues(display, includeGallery);
  const options = includeGallery
    ? HERO_COVER_DISPLAY_OPTIONS_WITH_GALLERY
    : HERO_COVER_DISPLAY_OPTIONS_NO_GALLERY;

  return (
    <Checkbox.Group
      disabled={disabled}
      options={options}
      value={checked}
      onChange={(next) => {
        onChange?.(heroCoverDisplayFromCheckedValues(next as HeroCoverDisplayKey[], includeGallery));
      }}
    />
  );
}

export const HERO_COVER_DISPLAY_FIELD_EXTRA =
  '控制看板右侧封面区块显示内容；按勾选过滤，顺序：视频 → 封面 → 轮播图。某项勾选且有素材才显示；全部不勾选则不显示右侧封面区';

export const HERO_COVER_DISPLAY_FIELD_EXTRA_NO_GALLERY =
  '控制看板右侧封面区块显示内容；按勾选过滤，顺序：视频 → 封面。某项勾选且有素材才显示；全部不勾选则不显示右侧封面区';
