export function pickBestTranslation<
	Segment extends { segmentTranslations: Array<Translation> },
	Translation = Segment["segmentTranslations"][number],
>(
	segments: Segment[],
): Array<
	Omit<Segment, "segmentTranslations"> & {
		segmentTranslation: Translation | null;
	}
> {
	return segments.map(({ segmentTranslations, ...segment }) => {
		if (segmentTranslations.length > 1) {
			console.error(
				"pickBestTranslation expected at most one translation; received",
				segmentTranslations.length,
			);
		}
		return {
			...segment,
			segmentTranslation: segmentTranslations[0] ?? null,
		};
	});
}

