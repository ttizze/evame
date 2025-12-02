import { markdownToMdastWithSegments } from "@/app/[locale]/_lib/markdown-to-mdast-with-segments";
import { upsertPageAndSegments } from "@/app/[locale]/(edit-layout)/user/[handle]/page/[pageSlug]/edit/_db/mutations.server";
import { prisma } from "@/lib/prisma";
import { slugify } from "../../_content-pages/utils/slugify";
import { findPrimarySegmentType } from "../../db/find-primary-segment-type";

interface CategoryPageParams {
	title: string;
	dirPath: string;
	parentId: number;
	userId: string;
	order: number;
}

export async function createCategoryPage({
	title,
	dirPath,
	parentId,
	userId,
	order,
}: CategoryPageParams): Promise<number> {
	const mdast = await markdownToMdastWithSegments({
		header: title,
		markdown: "",
	});

	const slug = slugify(`tipitaka-${dirPath}`);

	const segmentTypeId = await findPrimarySegmentType();

	await upsertPageAndSegments({
		pageId: undefined,
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
