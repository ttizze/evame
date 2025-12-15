import { markdownToMdastWithSegments } from "@/app/[locale]/_domain/markdown-to-mdast-with-segments";
import { upsertPageAndSegments } from "@/app/[locale]/(edit-layout)/user/[handle]/page/[pageSlug]/edit/_components/edit-page-client/service/upsert-page-and-segments";
import type { PageStatus } from "@/drizzle/types";
import { prisma } from "@/tests/prisma";
import { slugify } from "../../utils/slugify";

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
	await upsertPageAndSegments({
		pageSlug: slug,
		userId,
		title,
		mdastJson: mdast.mdastJson,
		sourceLocale: "pi",
		segments: mdast.segments,
		segmentTypeId: null,
		parentId,
		order,
		anchorContentId: null,
		status: "PUBLIC" satisfies PageStatus,
	});

	const page = await prisma.page.findFirstOrThrow({
		where: { slug, userId },
		select: { id: true },
	});

	return page.id;
}
