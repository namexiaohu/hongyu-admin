import 'server-only';

import { resolveOssAssetUrl } from '@/lib/oss-asset-url';
import {
  compactListHeroBoards,
  createEmptyListHeroBoards,
  type AdminListHeroBoard,
  type AdminListHeroBoardsRecord,
  type ListHeroBoardKey,
  type ListHeroBoardsRecord,
} from '@/lib/list-hero-board';
import { resolveAdminRowMediaPreviews } from '@/lib/admin-media-previews';

const boardKeys: ListHeroBoardKey[] = ['solutions', 'insights', 'surgeons', 'centers'];

export function mapAdminListHeroBoards(input: ListHeroBoardsRecord | undefined): AdminListHeroBoardsRecord {
  const boards = compactListHeroBoards(input);
  const result = {} as AdminListHeroBoardsRecord;

  for (const key of boardKeys) {
    const row = boards[key];
    const previews = resolveAdminRowMediaPreviews(row, resolveOssAssetUrl);
    // Promote legacy backgroundImage (mode empty) so admin shows upload, not empty/solid.
    const backgroundMode = (row.backgroundMode || previews.background.mode || '') as AdminListHeroBoard['backgroundMode'];
    const backgroundValue = row.backgroundValue
      || (backgroundMode === 'upload' ? (row.backgroundImage || previews.background.value) : '')
      || '';
    result[key] = {
      ...row,
      backgroundMode,
      backgroundValue,
      coverPreviewUrl: previews.cover.previewUrl,
      backgroundPreviewUrl: previews.background.previewUrl,
    } satisfies AdminListHeroBoard;
  }

  return result;
}

export function mergeListHeroBoardsForWrite(
  current: ListHeroBoardsRecord | undefined,
  patch: Partial<ListHeroBoardsRecord> | undefined,
): ListHeroBoardsRecord {
  const base = compactListHeroBoards(current ?? createEmptyListHeroBoards());
  if (!patch) return base;
  return compactListHeroBoards({
    solutions: patch.solutions ? { ...base.solutions, ...patch.solutions } : base.solutions,
    insights: patch.insights ? { ...base.insights, ...patch.insights } : base.insights,
    surgeons: patch.surgeons ? { ...base.surgeons, ...patch.surgeons } : base.surgeons,
    centers: patch.centers ? { ...base.centers, ...patch.centers } : base.centers,
  });
}
