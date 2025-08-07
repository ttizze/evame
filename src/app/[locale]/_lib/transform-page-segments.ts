import type { SanitizedUser } from "@/app/types";

export function transformPageSegments(
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
		}[];
	}[],
) {
	return pageSegments.map((seg) => ({
		id: seg.id,
		number: seg.number,
		text: seg.text,
		segmentTranslation: seg.pageSegmentTranslations[0]
			? {
					...seg.pageSegmentTranslations[0],
					createdAt: seg.pageSegmentTranslations[0].createdAt.toISOString(),
				}
			: undefined,
	}));
}
