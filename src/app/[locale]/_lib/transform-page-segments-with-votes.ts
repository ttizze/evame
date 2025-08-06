import type { SanitizedUser } from "@/app/types";

export function transformPageSegmentsWithVotes(
	pageSegments: {
		id: number;
		number: number;
		text: string;
		pageSegmentTranslations: {
			id: number;
			locale: string;
			text: string;
			point: number;
			createdAt: Date;
			user: SanitizedUser;
			votes?: { isUpvote: boolean; updatedAt: Date }[];
		}[];
	}[],
) {
	return pageSegments.map((seg) => ({
		id: seg.id,
		number: seg.number,
		text: seg.text,
		segmentTranslations: seg.pageSegmentTranslations.map((t) => ({
			...t,
			currentUserVote: t.votes?.[0] ?? null,
		})),
	}));
}
