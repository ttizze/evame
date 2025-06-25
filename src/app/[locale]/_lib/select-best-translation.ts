import type { BaseTranslation } from '../types';

export function selectBestTranslation<T extends BaseTranslation>(
  translations: readonly T[]
): T | null {
  if (translations.length === 0) return null;

  // 1) ユーザ投票を最優先
  const upvoted = translations.find((t) => t.currentUserVote?.isUpvote);
  if (upvoted) {
    return upvoted;
  }

  // 2) point → createdAt
  return translations.reduce((best, cur) => {
    if (cur.point !== best.point) return cur.point > best.point ? cur : best;
    return cur.createdAt > best.createdAt ? cur : best;
  });
}
