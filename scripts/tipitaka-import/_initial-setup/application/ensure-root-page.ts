import { markdownToMdastWithSegments } from "@/app/[locale]/_lib/markdown-to-mdast-with-segments";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
	executeTransaction,
	findPageWithContent,
} from "../../_pages/db/execute-transaction";
import { syncSegmentsWithFallback } from "../../_pages/db/sync-segments-with-fallback";
import { upsertPage } from "../../_pages/db/upsert-page";
import { ROOT_SLUG, ROOT_TITLE } from "../../constants";
import type { PageWithContent } from "../../types";

export async function ensureRootPage(
	userId: string,
	segmentTypeId: number,
): Promise<PageWithContent> {
	const currentDir = path.dirname(fileURLToPath(import.meta.url));
	const readmePath = path.join(currentDir, "..", "..", "README.md");
	const markdownContent = await fs.readFile(readmePath, "utf-8");

	const parsed = await markdownToMdastWithSegments({
		header: ROOT_TITLE,
		markdown: markdownContent,
	});

	return await executeTransaction(async (tx) => {
		const page = await upsertPage({
			tx,
			slug: ROOT_SLUG,
			mdastJson: parsed.mdastJson,
			parentId: null,
			order: 0,
			userId,
		});

		await syncSegmentsWithFallback(
			tx,
			page.id,
			parsed.segments,
			ROOT_TITLE,
			segmentTypeId,
		);

		return findPageWithContent(tx, page.id);
	});
}
