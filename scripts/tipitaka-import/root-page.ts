import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Prisma, PrismaClient } from "@prisma/client";
import { markdownToMdastWithSegments } from "@/app/[locale]/_lib/markdown-to-mdast-with-segments";
import { syncSegments } from "@/lib/sync-segments";

import { ROOT_SLUG, ROOT_TITLE } from "./constants";

type PageWithContent = Prisma.PageGetPayload<{ include: { content: true } }>;

export async function ensureRootPage(
	prisma: PrismaClient,
	userId: string,
	segmentTypeId: number,
): Promise<PageWithContent> {
	const currentDir = path.dirname(fileURLToPath(import.meta.url));
	const readmePath = path.join(currentDir, "README.md");
	const markdownContent = await fs.readFile(readmePath, "utf-8");

	const parsed = await markdownToMdastWithSegments({
		header: ROOT_TITLE,
		markdown: markdownContent,
	});

	return await prisma.$transaction(async (tx) => {
		const existingPage = await tx.page.findUnique({
			where: { slug: ROOT_SLUG },
		});

		const contentId =
			existingPage?.id ??
			(await tx.content.create({ data: { kind: "PAGE" } })).id;

		const page = await tx.page.upsert({
			where: { slug: ROOT_SLUG },
			update: { mdastJson: parsed.mdastJson },
			create: {
				id: contentId,
				slug: ROOT_SLUG,
				parentId: null,
				order: 0,
				userId,
				mdastJson: parsed.mdastJson,
				status: "PUBLIC",
				sourceLocale: "pi",
			},
			include: { content: true },
		});

		await syncSegments(tx, page.id, parsed.segments, segmentTypeId);

		return page;
	});
}
