/**
 * 段落番号マッピングとアノテーションセグメントIDからリンク作成データを構築する
 */
export function buildLinksToCreate(
	paragraphNumberToPrimarySegmentId: Map<string, number>,
	paragraphNumberToAnnotationSegmentIds: Map<string, number[]>,
): {
	linksToCreate: Array<{
		mainSegmentId: number;
		annotationSegmentId: number;
	}>;
	failedLinks: Array<{
		paragraphNumber: string;
		annotationSegmentIds: number[];
		reason: string;
	}>;
} {
	const linksToCreate: Array<{
		mainSegmentId: number;
		annotationSegmentId: number;
	}> = [];

	const failedLinks: Array<{
		paragraphNumber: string;
		annotationSegmentIds: number[];
		reason: string;
	}> = [];

	for (const [
		paragraphNumber,
		annotationSegmentIds,
	] of paragraphNumberToAnnotationSegmentIds) {
		const primarySegmentId =
			paragraphNumberToPrimarySegmentId.get(paragraphNumber);
		if (primarySegmentId) {
			for (const annotationSegmentId of annotationSegmentIds) {
				linksToCreate.push({
					mainSegmentId: primarySegmentId,
					annotationSegmentId,
				});
			}
		} else {
			failedLinks.push({
				paragraphNumber,
				annotationSegmentIds,
				reason: "No primary segment found for this paragraph number",
			});
		}
	}

	return { linksToCreate, failedLinks };
}
