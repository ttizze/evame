export type SegmentForRender = {
	id: number;
	number: number;
	text: string;
	segmentTranslation: null | { id: number; text: string };
	annotations: Array<{
		annotationSegment: AnnotationSegmentMin;
	}>;
};

type AnnotationSegmentMin = {
	id: number;
	number: number;
	text: string;
	segmentTranslation: null | { id: number; text: string };
	segmentType?: { label?: string | null } | null;
};
