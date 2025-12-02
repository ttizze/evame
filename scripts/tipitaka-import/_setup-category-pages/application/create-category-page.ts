import { markdownToMdastWithSegments } from "@/app/[locale]/_lib/markdown-to-mdast-with-segments";
import { executeTransaction } from "../../_pages/db/execute-transaction";
import { upsertPageWithSegments } from "../../_pages/db/upsert-page-with-segments";
import { slugify } from "../../_pages/domain/slugify";
import type { CategoryNode } from "../../types";

interface CategoryPageParams {
	node: CategoryNode;
	dirPath: string;
	parentId: number;
	userId: string;
	order: number;
	segmentTypeId: number;
}

export async function createCategoryPage({
	node,
	dirPath,
	parentId,
	userId,
	order,
	segmentTypeId,
}: CategoryPageParams): Promise<void> {
	const mdast = await markdownToMdastWithSegments({
		header: node.title,
		markdown: "",
	});

	const slug = slugify(`tipitaka-${dirPath}`);

	const pageResult = await executeTransaction(async (tx) => {
		return await upsertPageWithSegments(tx, {
			slug,
			mdastJson: mdast.mdastJson,
			parentId,
			order,
			userId,
			segments: mdast.segments,
			fallbackTitle: node.title,
			segmentTypeId,
		});
	});

	node.pageId = pageResult;
}
