import type { SegmentTranslationWithVote } from "../types";

export function getBestTranslation(
	translationsWithVotes: SegmentTranslationWithVote[],
): SegmentTranslationWithVote | null {
	if (translationsWithVotes.length === 0) {
		return null;
	}
	const upvotedTranslations = translationsWithVotes.filter(
		(t) => t.translationVote?.isUpvote,
	);
	if (upvotedTranslations.length > 0) {
		return upvotedTranslations.reduce((prev, current) => {
			const currentUpdatedAt =
				current.translationVote?.updatedAt ?? new Date(0);
			const prevUpdatedAt = prev.translationVote?.updatedAt ?? new Date(0);
			return currentUpdatedAt > prevUpdatedAt ? current : prev;
		});
	}
	return translationsWithVotes.reduce((prev, current) => {
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
