import path from "node:path";
import type { TipitakaFileMeta } from "../../../types";
import { BASE_DIR } from "../../../utils/constants";

export function getFilePath(tipitakaFileMeta: TipitakaFileMeta): string {
	const mdFileName = `${path.basename(tipitakaFileMeta.fileKey, path.extname(tipitakaFileMeta.fileKey))}.md`;
	return path.join(BASE_DIR, ...tipitakaFileMeta.dirSegments, mdFileName);
}
