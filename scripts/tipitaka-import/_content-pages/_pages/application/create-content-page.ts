import fs from "node:fs/promises";
import { markdownToMdastWithSegments } from "@/app/[locale]/_lib/markdown-to-mdast-with-segments";
import { upsertPageAndSegments } from "@/app/[locale]/(edit-layout)/user/[handle]/page/[pageSlug]/edit/_db/mutations.server";
import { prisma } from "@/lib/prisma";
import type { TipitakaFileMeta } from "../../../types";
import { slugify } from "../../utils/slugify";
import { findSegmentTypeIdForTipitakaPrimaryOrCommentary } from "../_find-segment-type-id/application/find-segment-type-id";
import { removeHeader } from "../domain/remove-header";
import { getDirectoryTitle } from "../utils/get-directory-title";
import { getFilePath } from "../utils/get-file-path";

interface ContentPageParams {
	entry: TipitakaFileMeta;
	parentId: number;
	userId: string;
	order: number;
}

export async function createContentPage({
	entry: tipitakaFileMeta,
	parentId,
	userId,
	order,
}: ContentPageParams): Promise<number> {
	const filePath = getFilePath(tipitakaFileMeta);
	const raw = await fs.readFile(filePath, "utf8");
	const { body } = removeHeader(raw);
	const directoryTitle = getDirectoryTitle(tipitakaFileMeta);

	const title = directoryTitle;

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
	});

	const page = await prisma.page.findFirstOrThrow({
		where: { slug, userId },
		select: { id: true },
	});

	return page.id;
}
