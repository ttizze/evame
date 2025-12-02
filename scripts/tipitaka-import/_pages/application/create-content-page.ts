import fs from "node:fs/promises";
import path from "node:path";
import { markdownToMdastWithSegments } from "@/app/[locale]/_lib/markdown-to-mdast-with-segments";
import type { TipitakaFileMeta } from "../../types";
import { beautifySlug } from "../../utils/beautify-slug";
import { executeTransaction } from "../db/execute-transaction";
import { upsertPageWithSegments } from "../db/upsert-page-with-segments";
import { getDirectoryTitle } from "../domain/get-directory-title";
import { getFilePath } from "../domain/get-file-path";
import { slugify } from "../domain/slugify";
import { splitHeaderAndBody } from "../domain/split-header-and-body";

interface ContentPageParams {
	entry: TipitakaFileMeta;
	parentId: number;
	userId: string;
	order: number;
	segmentTypeId: number;
}

export async function createContentPage({
	entry: tipitakaFileMeta,
	parentId,
	userId,
	order,
	segmentTypeId,
}: ContentPageParams): Promise<number> {
	const filePath = getFilePath(tipitakaFileMeta);
	const raw = await fs.readFile(filePath, "utf8");
	const { header, body } = splitHeaderAndBody(raw);
	const directoryTitle = getDirectoryTitle(tipitakaFileMeta);
	const fallbackTitle = beautifySlug(
		path.basename(filePath, ".md").replace(/\./g, " "),
	);
	const title = directoryTitle || header || fallbackTitle;

	const mdast = await markdownToMdastWithSegments({
		header: title,
		markdown: body,
	});

	const slug = slugify(`tipitaka-${tipitakaFileMeta.fileKey}`);

	return await executeTransaction(async (tx) => {
		return await upsertPageWithSegments(tx, {
			slug,
			mdastJson: mdast.mdastJson,
			parentId,
			order,
			userId,
			segments: mdast.segments,
			fallbackTitle: title,
			segmentTypeId,
		});
	});
}
