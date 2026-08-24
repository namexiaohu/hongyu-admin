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

const boardKeys: ListHeroBoardKey[] = ['insights', 'surgeons', 'centers'];

export function mapAdminListHeroBoards(input: ListHeroBoardsRecord | undefined): AdminListHeroBoardsRecord {
  const boards = compactListHeroBoards(input);
  const result = {} as AdminListHeroBoardsRecord;

  for (const key of boardKeys) {
    const row = boards[key];
    const previews = resolveAdminRowMediaPreviews(row, resolveOssAssetUrl);
    result[key] = {
      ...row,
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
    insights: patch.insights ? { ...base.insights, ...patch.insights } : base.insights,
    surgeons: patch.surgeons ? { ...base.surgeons, ...patch.surgeons } : base.surgeons,
    centers: patch.centers ? { ...base.centers, ...patch.centers } : base.centers,
  });
}
