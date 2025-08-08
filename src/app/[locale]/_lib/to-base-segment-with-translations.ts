import type { BaseSegment, BaseTranslation } from "../types";

type BaseSegmentWithTranslations = BaseSegment & {
	[key: string]: BaseTranslation[] | number | string | Date;
};

export function toBaseSegmentWithTranslations(
	segments: BaseSegmentWithTranslations[],
	translationProperty: string,
) {
	return segments.map((seg) => ({
		id: seg.id,
		number: seg.number,
		text: seg.text,
		segmentTranslation: (seg[translationProperty] as BaseTranslation[])[0],
	}));
}
