export interface SegmentType {
	id: number;
	key: string;
	label: string;
}

export function derivePrimaryAndCommentary(segmentTypes: SegmentType[]): {
	primarySegmentType: SegmentType;
	commentarySegmentTypeIdByLabel: Map<string, number>;
} {
	const primarySegmentType = segmentTypes.find(
		(segmentType) => segmentType.key === "PRIMARY",
	);
	if (!primarySegmentType) {
		throw new Error('Segment type "PRIMARY" not found');
	}

	const commentarySegmentTypeIdByLabel = new Map(
		segmentTypes
			.filter((segmentType) => segmentType.key === "COMMENTARY")
			.map((commentarySegmentType) => [
				commentarySegmentType.label,
				commentarySegmentType.id,
			]),
	);

	return { primarySegmentType, commentarySegmentTypeIdByLabel };
}
