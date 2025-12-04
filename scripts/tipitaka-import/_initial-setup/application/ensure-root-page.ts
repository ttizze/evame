import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PageStatus } from "@prisma/client";
import { markdownToMdastWithSegments } from "@/app/[locale]/_lib/markdown-to-mdast-with-segments";
import { upsertPageAndSegments } from "@/app/[locale]/(edit-layout)/user/[handle]/page/[pageSlug]/edit/_components/edit-page-client/service/upsert-page-and-segments";
import { prisma } from "@/lib/prisma";
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
		order: 0,
		status: PageStatus.PUBLIC,
	});

	const page = await prisma.page.findFirstOrThrow({
		where: { slug: ROOT_SLUG, userId },
		select: { id: true },
	});

	return page.id;
}
