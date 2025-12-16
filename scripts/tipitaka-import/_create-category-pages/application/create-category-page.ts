import { markdownToMdastWithSegments } from "@/app/[locale]/_domain/markdown-to-mdast-with-segments";
import { upsertPageAndSegments } from "@/app/[locale]/(edit-layout)/user/[handle]/page/[pageSlug]/edit/_components/edit-page-client/service/upsert-page-and-segments";
import { db } from "@/db";
import type { Pagestatus } from "@/db/types";
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
		status: "PUBLIC" satisfies Pagestatus,
	});

	const page = await db
		.selectFrom("pages")
		.select("id")
		.where("slug", "=", slug)
		.where("userId", "=", userId)
		.executeTakeFirst();

	if (!page) {
		throw new Error(`Page with slug ${slug} and userId ${userId} not found`);
	}

	return page.id;
}
