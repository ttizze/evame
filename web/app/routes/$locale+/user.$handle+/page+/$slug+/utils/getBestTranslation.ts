import type { PageSegmentTranslationWithVote } from "../types";

export function getBestTranslation(
	translationsWithVotes: PageSegmentTranslationWithVote[],
): PageSegmentTranslationWithVote | null {
	if (translationsWithVotes.length === 0) {
		return null;
	}
	const upvotedTranslations = translationsWithVotes.filter(
		(t) => t.vote?.isUpvote,
	);
	if (upvotedTranslations.length > 0) {
		return upvotedTranslations.reduce((prev, current) => {
			const currentUpdatedAt = current.vote?.updatedAt ?? new Date(0);
			const prevUpdatedAt = prev.vote?.updatedAt ?? new Date(0);
			return currentUpdatedAt > prevUpdatedAt ? current : prev;
		});
	}
	return translationsWithVotes.reduce((prev, current) => {
		if (
			prev.pageSegmentTranslation.point !== current.pageSegmentTranslation.point
		) {
			return prev.pageSegmentTranslation.point >
				current.pageSegmentTranslation.point
				? prev
				: current;
		}
		return new Date(current.pageSegmentTranslation.createdAt) >
			new Date(prev.pageSegmentTranslation.createdAt)
			? current
			: prev;
	});
}
