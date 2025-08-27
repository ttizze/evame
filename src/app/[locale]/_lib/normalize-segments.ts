export function normalizeSegments<
	Segment extends { segmentTranslations: Array<Translation> },
	Translation = Segment["segmentTranslations"][number],
>(
	segments: Segment[],
): Array<
	Omit<Segment, "segmentTranslations"> & {
		segmentTranslation: Translation | null;
	}
> {
	return segments.map(({ segmentTranslations, ...segment }) => ({
		...segment,
		segmentTranslation: segmentTranslations[0] ?? null,
	}));
}
