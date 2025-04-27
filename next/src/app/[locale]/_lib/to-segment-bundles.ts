import type { TargetContentType } from "@/app/[locale]/(common-layout)/user/[handle]/page/[slug]/constants";
import type { SanitizedUser } from "@/app/types";
import type { BaseTranslation, SegmentBundle } from "../types";
import { selectBestTranslation } from "./select-best-translation";
export function toSegmentBundles<
	RawVote extends { isUpvote: boolean; updatedAt: Date } | null | undefined,
	RawTranslation extends {
		id: number;
		locale: string;
		text: string;
		point: number;
		createdAt: Date;
		user: SanitizedUser;
		currentUserVote?: RawVote;
	},
	RawSegment extends {
		id: number;
		number: number;
		text: string;
		segmentTranslations: readonly RawTranslation[];
	},
>(
	parentType: TargetContentType,
	parentId: number,
	rawSegments: readonly RawSegment[],
): SegmentBundle[] {
	return rawSegments.map((seg) => {
		const translations: BaseTranslation[] = seg.segmentTranslations.map(
			(tr) => ({
				id: tr.id,
				locale: tr.locale,
				text: tr.text,
				point: tr.point,
				createdAt: tr.createdAt.toISOString(),
				user: tr.user,
				currentUserVote: tr.currentUserVote
					? {
							isUpvote: tr.currentUserVote.isUpvote,
							updatedAt: tr.currentUserVote.updatedAt.toISOString(),
						}
					: null,
			}),
		);

		return {
			parentType,
			parentId,
			segment: {
				id: seg.id,
				number: seg.number,
				text: seg.text,
			},
			translations,
			best: selectBestTranslation(translations),
		} satisfies SegmentBundle;
	});
}
