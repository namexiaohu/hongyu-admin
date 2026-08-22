export const contentBlockSplitLayouts = ['image-left', 'image-right'] as const;
export type ContentBlockSplitLayout = (typeof contentBlockSplitLayouts)[number];

export const contentBlockSummaryLayouts = ['single-row', 'multi-2', 'multi-3'] as const;
export type ContentBlockSummaryLayout = (typeof contentBlockSummaryLayouts)[number];

export const contentBlockSummaryIcons = [
  'layers',
  'check',
  'users',
  'award',
  'shield',
  'heart',
  'globe',
  'clock',
  'book',
  'flask',
  'lightbulb',
  'target',
  'star',
  'building',
  'cpu',
  'activity',
] as const;
export type ContentBlockSummaryIcon = (typeof contentBlockSummaryIcons)[number];

export const defaultContentBlockSummaryIcon: ContentBlockSummaryIcon = 'layers';

export function isContentBlockSummaryIcon(value: string | undefined): value is ContentBlockSummaryIcon {
  return contentBlockSummaryIcons.includes(value as ContentBlockSummaryIcon);
}

export type ContentBlockLocaleCopy = {
  smallTitle: string;
  largeTitle: string;
  description: string;
  buttonLabel?: string;
  badge?: string;
  totalHours?: string;
  teachingFormat?: string;
  trainingCycle?: string;
};

export type ContentBlockCarouselSlide = {
  id: string;
  url: string;
};
