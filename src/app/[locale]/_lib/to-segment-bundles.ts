import type { TargetContentType } from "@/app/[locale]/(common-layout)/user/[handle]/page/[pageSlug]/constants";

import type { BaseSegment, BaseTranslation, SegmentBundle } from "../types";

export function toSegmentBundles(
	parentType: TargetContentType,
	parentId: number,
	rawSegments: readonly (BaseSegment & {
		segmentTranslation?: BaseTranslation;
	})[],
): SegmentBundle[] {
	return rawSegments.map((segment) => {
		return {
			parentType,
			parentId,
			...segment,
		} satisfies SegmentBundle;
	});
}
