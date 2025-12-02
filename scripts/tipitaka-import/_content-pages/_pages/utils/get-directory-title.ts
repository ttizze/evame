import { parseDirSegment } from "../../../domain/parse-dir-segment";
import type { TipitakaFileMeta } from "../../../types";

export function getDirectoryTitle(tipitakaFileMeta: TipitakaFileMeta): string {
	const lastSegment =
		tipitakaFileMeta.dirSegments[tipitakaFileMeta.dirSegments.length - 1];
	const { title } = parseDirSegment(lastSegment);
	return title;
}
