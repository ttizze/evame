import type { SegmentTranslationWithVote } from "../types";

export async function getBestTranslation(
	segmentTranslationWithVote: SegmentTranslationWithVote[],
): Promise<SegmentTranslationWithVote | null> {
	if (segmentTranslationWithVote.length === 0) {
		return null;
	}
	const upvotedTranslations = segmentTranslationWithVote.filter(
		(t) => t.translationCurrentUserVote?.isUpvote,
	);
	if (upvotedTranslations.length > 0) {
		return upvotedTranslations.reduce((prev, current) => {
			const currentUpdatedAt =
				current.translationCurrentUserVote?.updatedAt ?? new Date(0);
			const prevUpdatedAt =
				prev.translationCurrentUserVote?.updatedAt ?? new Date(0);
			new Date(0);
			return currentUpdatedAt > prevUpdatedAt ? current : prev;
		});
	}
	return segmentTranslationWithVote.reduce((prev, current) => {
		if (prev.point !== current.point) {
			return prev.point > current.point ? prev : current;
		}
		return new Date(current.createdAt) > new Date(prev.createdAt)
			? current
			: prev;
	});
}
