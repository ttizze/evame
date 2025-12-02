import path from "node:path";
import { BASE_DIR } from "../../constants";
import type { TipitakaFileMeta } from "../../types";

export function getFilePath(tipitakaFileMeta: TipitakaFileMeta): string {
	const mdFileName = `${path.basename(tipitakaFileMeta.fileKey, path.extname(tipitakaFileMeta.fileKey))}.md`;
	return path.join(BASE_DIR, ...tipitakaFileMeta.dirSegments, mdFileName);
}
