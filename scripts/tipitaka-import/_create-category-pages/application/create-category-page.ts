import { and, eq } from "drizzle-orm";
import { markdownToMdastWithSegments } from "@/app/[locale]/_domain/markdown-to-mdast-with-segments";
import { upsertPageAndSegments } from "@/app/[locale]/(edit-layout)/user/[handle]/page/[pageSlug]/edit/_components/edit-page-client/service/upsert-page-and-segments";
import { db } from "@/drizzle";
import { pages } from "@/drizzle/schema";
import type { PageStatus } from "@/drizzle/types";
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

	const [page] = await db
		.select({ id: pages.id })
		.from(pages)
		.where(and(eq(pages.slug, slug), eq(pages.userId, userId)))
		.limit(1);

	if (!page) {
		throw new Error(`Page with slug ${slug} and userId ${userId} not found`);
	}

	return page.id;
}
