import fs from "node:fs/promises";
import { PageStatus } from "@prisma/client";
import { markdownToMdastWithSegments } from "@/app/[locale]/_domain/markdown-to-mdast-with-segments";
import { upsertPageAndSegments } from "@/app/[locale]/(edit-layout)/user/[handle]/page/[pageSlug]/edit/_components/edit-page-client/service/upsert-page-and-segments";
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
	anchorContentId: number | null;
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
		status: PageStatus.PUBLIC,
	});

	const page = await findPageBySlugAndUserId(slug, userId);

	return page.id;
}
