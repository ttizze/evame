import { upsertPageAndSegments } from "@/app/[locale]/(edit-layout)/user/[handle]/page/[pageSlug]/edit/_db/mutations.server";
import { markdownToMdastWithSegments } from "@/app/[locale]/_lib/markdown-to-mdast-with-segments";
import fs from "node:fs/promises";
import { parseDirSegment } from "../../../domain/parse-dir-segment/parse-dir-segment";
import type { TipitakaFileMeta } from "../../../types";
import { slugify } from "../../../utils/slugify";
import { findSegmentTypeIdForTipitakaPrimaryOrCommentary } from "../_find-segment-type-id/application/find-segment-type-id";
import { findPageBySlugAndUserId } from "../db/pages";
import { removeHeader } from "../domain/remove-header";
import { getFilePath } from "../utils/get-file-path";

interface ContentPageParams {
	entry: TipitakaFileMeta;
	parentId: number;
	userId: string;
	order: number;
	anchorContentId?: number;
}

export async function createContentPage({
	entry: tipitakaFileMeta,
	parentId,
	userId,
	order,
	anchorContentId,
}: ContentPageParams): Promise<number> {
	const filePath = getFilePath(tipitakaFileMeta);
	const raw = await fs.readFile(filePath, "utf8");
	const { body } = removeHeader(raw);
	const lastSegment =
		tipitakaFileMeta.dirSegments[tipitakaFileMeta.dirSegments.length - 1];
	const { title } = parseDirSegment(lastSegment);

	const mdast = await markdownToMdastWithSegments({
		header: title,
		markdown: body,
	});

	const slug = slugify(`tipitaka-${tipitakaFileMeta.fileKey}`);

	const segmentTypeId = await findSegmentTypeIdForTipitakaPrimaryOrCommentary(
		tipitakaFileMeta.primaryOrCommentary,
	);

	await upsertPageAndSegments({
		pageSlug: slug,
		userId,
		title,
		mdastJson: mdast.mdastJson,
		sourceLocale: "pi",
		segments: mdast.segments,
		segmentTypeId,
		parentId,
		order,
		anchorContentId,
	});

	const page = await findPageBySlugAndUserId(slug, userId);

	return page.id;
}
