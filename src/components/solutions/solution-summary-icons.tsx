'use client';

import type { CSSProperties, ReactNode } from 'react';

import {
  solutionSummaryIcons,
  type SolutionSummaryIcon,
} from '@/lib/solution-blocks';

const iconStroke = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

const summaryIconSvgs: Record<SolutionSummaryIcon, ReactNode> = {
  layers: (
    <svg {...iconStroke}>
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  ),
  check: (
    <svg {...iconStroke}>
      <circle cx="12" cy="12" r="10" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  ),
  users: (
    <svg {...iconStroke}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  award: (
    <svg {...iconStroke}>
      <circle cx="12" cy="8" r="6" />
      <path d="M8.2 13.5L7 22l5-3 5 3-1.2-8.5" />
    </svg>
  ),
  shield: (
    <svg {...iconStroke}>
      <path d="M12 3l8 3v6c0 5-3.4 7.8-8 9-4.6-1.2-8-4-8-9V6l8-3z" />
    </svg>
  ),
  heart: (
    <svg {...iconStroke}>
      <path d="M20.8 5.6a5 5 0 0 0-7.1 0L12 7.3l-1.7-1.7a5 5 0 0 0-7.1 7.1L12 21.3l8.8-8.6a5 5 0 0 0 0-7.1z" />
    </svg>
  ),
  globe: (
    <svg {...iconStroke}>
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20z" />
    </svg>
  ),
  clock: (
    <svg {...iconStroke}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  ),
  book: (
    <svg {...iconStroke}>
      <path d="M4 4h6a4 4 0 0 1 4 4v12a3 3 0 0 0-3-3H4z" />
      <path d="M20 4h-6a4 4 0 0 0-4 4v12a3 3 0 0 1 3-3h7z" />
    </svg>
  ),
  flask: (
    <svg {...iconStroke}>
      <path d="M9 3h6" />
      <path d="M10 3v6.2L5.2 19a2 2 0 0 0 1.7 3h10.2a2 2 0 0 0 1.7-3L14 9.2V3" />
    </svg>
  ),
  lightbulb: (
    <svg {...iconStroke}>
      <path d="M9 18h6" />
      <path d="M10 22h4" />
      <path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z" />
    </svg>
  ),
  target: (
    <svg {...iconStroke}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.5" />
    </svg>
  ),
  star: (
    <svg {...iconStroke}>
      <path d="M12 3l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.8 6.8 19l1-5.8L3.6 9.1l5.8-.8z" />
    </svg>
  ),
  building: (
    <svg {...iconStroke}>
      <path d="M4 21V7l8-4 8 4v14" />
      <path d="M9 21v-6h6v6" />
      <path d="M9 10h.01M15 10h.01M9 14h.01M15 14h.01" />
    </svg>
  ),
  cpu: (
    <svg {...iconStroke}>
      <rect x="6" y="6" width="12" height="12" rx="2" />
      <path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4" />
    </svg>
  ),
  activity: (
    <svg {...iconStroke}>
      <path d="M3 12h4l2.5-6 5 12 2.5-6H21" />
    </svg>
  ),
};

type SolutionSummaryIconPickerProps = {
  value?: string;
  onChange: (icon: SolutionSummaryIcon) => void;
};

const tileStyle: CSSProperties = {
  width: 52,
  height: 52,
  padding: 0,
  borderRadius: 10,
  border: '1px solid #e8edf3',
  background: '#f4f7fb',
  color: '#1d3557',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
};

export function SolutionSummaryIconSvg({ icon }: { icon: SolutionSummaryIcon }) {
  return summaryIconSvgs[icon];
}

export function SolutionSummaryIconPicker({ value, onChange }: SolutionSummaryIconPickerProps) {
  return (
    <div>
      <div style={{ marginBottom: 8 }}>图标</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {solutionSummaryIcons.map((icon) => {
          const selected = value === icon;
          return (
            <button
              key={icon}
              type="button"
              aria-label={icon}
              onClick={() => onChange(icon)}
              style={{
                ...tileStyle,
                borderColor: selected ? '#1677ff' : '#e8edf3',
                background: selected ? '#e6f4ff' : '#f4f7fb',
                boxShadow: selected ? '0 0 0 1px #1677ff inset' : undefined,
              }}
            >
              <span style={{ width: 24, height: 24, display: 'inline-flex' }}>
                {summaryIconSvgs[icon]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
