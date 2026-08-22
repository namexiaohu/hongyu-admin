'use client';

import { Segmented, Typography } from 'antd';

import {
  HERO_COPY_STYLE_OPTIONS,
  type HeroCopyStyle,
} from '@/lib/hero-copy-style';

type Props = {
  value?: HeroCopyStyle | null;
  onChange?: (value: HeroCopyStyle) => void;
  disabled?: boolean;
};

export function HeroCopyStyleField({ value, onChange, disabled = false }: Props) {
  const selected = value === 'light' ? 'light' : 'dark';

  return (
    <div>
      <Segmented
        disabled={disabled}
        value={selected}
        onChange={(v) => onChange?.(v as HeroCopyStyle)}
        options={HERO_COPY_STYLE_OPTIONS.map((item) => ({
          label: item.label,
          value: item.value,
        }))}
      />
      <Typography.Text type="secondary" style={{ display: 'block', marginTop: 8, fontSize: 12 }}>
        明亮大背景图选暗色系（深色字）；深色或纯色背景选浅色系（浅色字）。
      </Typography.Text>
    </div>
  );
}
