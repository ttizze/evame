import fs from "node:fs/promises";
import path from "node:path";
import type { PrismaClient } from "@prisma/client";
import { markdownToMdastWithSegments } from "@/app/[locale]/_lib/markdown-to-mdast-with-segments";

import { BASE_DIR } from "./constants";
import {
	beautifySlug,
	slugify,
	splitHeaderAndBody,
	upsertPageWithSegments,
} from "./helpers";
import type { DirectoryNode, ImportEntry } from "./types";

interface DirectoryPageParams {
	prisma: PrismaClient;
	node: DirectoryNode;
	directoryPath: string;
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
	directoryPath,
	parentId,
	userId,
	order,
	segmentTypeId,
}: DirectoryPageParams): Promise<void> {
	const mdast = await markdownToMdastWithSegments({
		header: node.title,
		markdown: "",
	});

	const slug = slugify(`tipitaka-${directoryPath}`);

	const pageId = await prisma.$transaction(
		async (tx) => {
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
		},
		{
			timeout: 60000, // 60 seconds for batch operations
		},
	);

	node.pageId = pageId;
}

function getFilePath(entry: ImportEntry): string {
	const mdFileName = `${path.basename(entry.fileKey, path.extname(entry.fileKey))}.md`;
	return path.join(BASE_DIR, ...entry.dirSegments, mdFileName);
}

export async function createContentPage({
	prisma,
	entry,
	parentId,
	userId,
	order,
	segmentTypeId,
}: ContentPageParams): Promise<number> {
	const filePath = getFilePath(entry);
	const raw = await fs.readFile(filePath, "utf8");
	const { header, body } = splitHeaderAndBody(raw);
	const fallbackTitle = beautifySlug(
		path.basename(filePath, ".md").replace(/\./g, " "),
	);
	const title = header || fallbackTitle;

	const mdast = await markdownToMdastWithSegments({
		header: title,
		markdown: body,
	});

	const slug = slugify(`tipitaka-${entry.fileKey}`);

	return await prisma.$transaction(
		async (tx) => {
			return await upsertPageWithSegments(tx, {
				slug,
				mdastJson: mdast.mdastJson,
				parentId,
				order,
				userId,
				segments: mdast.segments,
				fallbackTitle: title,
				segmentTypeId,
			});
		},
		{
			timeout: 60000, // 60 seconds for batch operations
		},
	);
}
