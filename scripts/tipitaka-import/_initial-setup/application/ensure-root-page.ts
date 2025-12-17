import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { markdownToMdastWithSegments } from "@/app/[locale]/_domain/markdown-to-mdast-with-segments";
import { upsertPageAndSegments } from "@/app/[locale]/(edit-layout)/user/[handle]/page/[pageSlug]/edit/_components/edit-page-client/service/upsert-page-and-segments";
import { db } from "@/db";
import type { Pagestatus } from "@/db/types";
import { ROOT_SLUG, ROOT_TITLE } from "../../utils/constants";

export async function ensureRootPage(userId: string): Promise<number> {
	const currentDir = path.dirname(fileURLToPath(import.meta.url));
	const readmePath = path.join(currentDir, "..", "..", "README.md");
	const markdownContent = await fs.readFile(readmePath, "utf-8");

	const parsed = await markdownToMdastWithSegments({
		header: ROOT_TITLE,
		markdown: markdownContent,
	});

	await upsertPageAndSegments({
		pageSlug: ROOT_SLUG,
		userId,
		title: ROOT_TITLE,
		mdastJson: parsed.mdastJson,
		sourceLocale: "pi",
		segments: parsed.segments,
		segmentTypeId: null,
		parentId: null,
		order: 0,
		anchorContentId: null,
		status: "PUBLIC" as Pagestatus,
	});

	const page = await db
		.selectFrom("pages")
		.select("id")
		.where("slug", "=", ROOT_SLUG)
		.where("userId", "=", userId)
		.executeTakeFirst();

	if (!page) {
		throw new Error(
			`Page with slug ${ROOT_SLUG} and userId ${userId} not found`,
		);
	}

	return page.id;
}
