import type { SegmentTranslationWithVote } from "../types";

export async function getBestTranslation(
	segmentTranslationWithVote: SegmentTranslationWithVote[],
): Promise<SegmentTranslationWithVote | null> {
	if (segmentTranslationWithVote.length === 0) {
		return null;
	}
	const upvotedTranslations = segmentTranslationWithVote.filter(
		(t) => t.segmentTranslation.translationCurrentUserVote?.isUpvote,
	);
	if (upvotedTranslations.length > 0) {
		return upvotedTranslations.reduce((prev, current) => {
			const currentUpdatedAt =
				current.segmentTranslation.translationCurrentUserVote?.updatedAt ??
				new Date(0);
			const prevUpdatedAt =
				prev.segmentTranslation.translationCurrentUserVote?.updatedAt ??
				new Date(0);
			return currentUpdatedAt > prevUpdatedAt ? current : prev;
		});
	}
	return segmentTranslationWithVote.reduce((prev, current) => {
		if (prev.segmentTranslation.point !== current.segmentTranslation.point) {
			return prev.segmentTranslation.point > current.segmentTranslation.point
				? prev
				: current;
		}
		return new Date(current.segmentTranslation.createdAt) >
			new Date(prev.segmentTranslation.createdAt)
			? current
			: prev;
	});
}
