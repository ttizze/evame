import fs from "node:fs/promises";
import path from "node:path";
import type { PrismaClient } from "@prisma/client";
import { generateSlug } from "@/app/[locale]/_lib/generate-slug";
import { markdownToMdastWithSegments } from "@/app/[locale]/_lib/markdown-to-mdast-with-segments";

import { beautifySlug, splitHeaderAndBody } from "./helpers";
import type { DirectoryNode, ImportEntry } from "./types";

interface DirectoryPageParams {
	prisma: PrismaClient;
	node: DirectoryNode;
	parentId: number;
	userId: string;
	order: number;
	segmentTypeId: number;
}

interface ContentPageParams {
	prisma: PrismaClient;
	entry: ImportEntry;
	parentId: number;
	userId: string;
	order: number;
	segmentTypeId: number;
}

export async function createDirectoryPage({
	prisma,
	node,
	parentId,
	userId,
	order,
	segmentTypeId,
}: DirectoryPageParams): Promise<void> {
	const mdast = await markdownToMdastWithSegments({
		header: node.title,
		markdown: "",
	});

	const content = await prisma.content.create({
		data: {
			kind: "PAGE",
		},
	});

	const page = await prisma.page.create({
		data: {
			id: content.id,
			slug: generateSlug(),
			parentId,
			order,
			userId,
			mdastJson: mdast.mdastJson,
			status: "PUBLIC",
			sourceLocale: "pi",
		},
	});

	if (mdast.segments.length === 0) {
		await prisma.segment.create({
			data: {
				contentId: content.id,
				number: 0,
				text: node.title,
				textAndOccurrenceHash: node.title,
				segmentTypeId,
			},
		});
	} else {
		await prisma.segment.createMany({
			data: mdast.segments.map((segment) => ({
				contentId: content.id,
				number: segment.number,
				text: segment.text,
				textAndOccurrenceHash: segment.hash,
				segmentTypeId,
			})),
		});
	}

	node.pageId = page.id;
}

export async function createContentPage({
	prisma,
	entry,
	parentId,
	userId,
	order,
	segmentTypeId,
}: ContentPageParams): Promise<number> {
	const raw = await fs.readFile(entry.filePath, "utf8");
	const { header, body } = splitHeaderAndBody(raw);
	const fallbackTitle = beautifySlug(
		path.basename(entry.mdFileName, ".md").replace(/\./g, " "),
	);
	const title = header || fallbackTitle;

	const mdast = await markdownToMdastWithSegments({
		header: title,
		markdown: body,
	});

	const content = await prisma.content.create({
		data: {
			kind: "PAGE",
		},
	});

	const page = await prisma.page.create({
		data: {
			id: content.id,
			slug: generateSlug(),
			parentId,
			order,
			userId,
			mdastJson: mdast.mdastJson,
			status: "PUBLIC",
			sourceLocale: "pi",
		},
	});

	await prisma.segment.deleteMany({
		where: { contentId: content.id },
	});

	if (mdast.segments.length === 0) {
		await prisma.segment.create({
			data: {
				contentId: content.id,
				number: 0,
				text: title,
				textAndOccurrenceHash: title,
				segmentTypeId,
			},
		});
	} else {
		await prisma.segment.createMany({
			data: mdast.segments.map((segment) => ({
				contentId: content.id,
				number: segment.number,
				text: segment.text,
				textAndOccurrenceHash: segment.hash,
				segmentTypeId,
			})),
		});
	}

	return page.id;
}
