'use client';

import { Segmented, Typography } from 'antd';

import {
  HERO_BACKGROUND_FIT_OPTIONS,
  type HeroBackgroundFitMode,
} from '@/lib/hero-background-fit';

type Props = {
  value?: HeroBackgroundFitMode | null;
  onChange?: (value: HeroBackgroundFitMode) => void;
  disabled?: boolean;
};

export function HeroBackgroundFitField({ value, onChange, disabled = false }: Props) {
  const selected = value === 'cover'
    ? 'cover'
    : value === 'contain-center'
      ? 'contain-center'
      : 'contain';

  return (
    <div>
      <Segmented
        disabled={disabled}
        value={selected}
        onChange={(v) => onChange?.(v as HeroBackgroundFitMode)}
        options={HERO_BACKGROUND_FIT_OPTIONS.map((item) => ({
          label: item.label,
          value: item.value,
        }))}
      />
      <Typography.Text type="secondary" style={{ display: 'block', marginTop: 8, fontSize: 12 }}>
        保持比例：宽度 100%，高度等比，顶部对齐，不足处按看板文案风格填充底色；保持比例居中：宽度 100%，高度等比，整图在看板内居中；拉伸铺满：整幅图片完全显示，宽高均拉伸至看板尺寸（不裁切）。
      </Typography.Text>
    </div>
  );
}
