import type { TargetContentType } from "@/app/[locale]/(common-layout)/user/[handle]/page/[pageSlug]/constants";

import type { BaseSegment, BaseSegmentBundle, BaseTranslation } from "../types";

export function toBaseSegmentBundles(
	parentType: TargetContentType,
	parentId: number,
	rawSegments: readonly (BaseSegment & {
		segmentTranslation?: BaseTranslation;
	})[],
): BaseSegmentBundle[] {
	return rawSegments.map((segment) => {
		return {
			parentType,
			parentId,
			...segment,
		} satisfies BaseSegmentBundle;
	});
}
