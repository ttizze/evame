import type { TranslationWithVote } from "../types";

export function getBestTranslation(
	translationsWithVotes: TranslationWithVote[],
): TranslationWithVote | null {
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
		if (prev.translateText.point !== current.translateText.point) {
			return prev.translateText.point > current.translateText.point
				? prev
				: current;
		}
		return new Date(current.translateText.createdAt) >
			new Date(prev.translateText.createdAt)
			? current
			: prev;
	});
}
