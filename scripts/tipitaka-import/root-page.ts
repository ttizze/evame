import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Prisma, PrismaClient } from "@prisma/client";
import { markdownToMdastWithSegments } from "@/app/[locale]/_lib/markdown-to-mdast-with-segments";
import { ROOT_SLUG, ROOT_TITLE } from "./constants";
import { syncSegmentsWithFallback, upsertPage } from "./helpers";

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

	return await prisma.$transaction(
		async (tx) => {
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

			return await tx.page.findUniqueOrThrow({
				where: { id: page.id },
				include: { content: true },
			});
		},
		{
			timeout: 60000, // 60 seconds for batch operations
		},
	);
}
