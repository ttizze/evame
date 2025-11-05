import { markdownToMdastWithSegments } from "@/app/[locale]/_lib/markdown-to-mdast-with-segments";
import { syncSegments } from "@/lib/sync-segments";
import type { Prisma, PrismaClient } from "@prisma/client";
import fs from "node:fs/promises";
import path from "node:path";

import { ROOT_SLUG, ROOT_TITLE } from "./constants";

type PageWithContent = Prisma.PageGetPayload<{ include: { content: true } }>;

export async function ensureRootPage(
	prisma: PrismaClient,
	userId: string,
	segmentTypeId: number,
): Promise<PageWithContent> {
	const readmePath = path.join(__dirname, "README.md");
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

		// number: 0 にタイトルを常に追加
		const segments = [
			{ number: 0, text: ROOT_TITLE, hash: ROOT_TITLE },
			...parsed.segments,
		];

		await syncSegments(tx, page.id, segments, segmentTypeId);

		return page;
	});
}
