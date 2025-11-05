import { type Prisma, PrismaClient, type SegmentType } from "@prisma/client";
import { readBooksJson } from "./books";
import { ROOT_TITLE, SYSTEM_USER_HANDLE } from "./constants";
import { buildDirectoryTree, collectPathMap } from "./directory-tree";
import { getOrderGenerator, getSortedChildren } from "./helpers";
import { createContentPage, createDirectoryPage } from "./pages";
import { ensureRootPage } from "./root-page";
import { ensureSegmentTypes } from "./segment-types";
import type { DirectoryNode, ImportEntry } from "./types";

type PageWithContent = Prisma.PageGetPayload<{ include: { content: true } }>;

// Step 4a: ムーラ → アッタカタ → ティカ → その他の順に並べ、親データを先に作成できるようにする
function sortEntries(entries: ImportEntry[]): ImportEntry[] {
	const levelOrder: Record<ImportEntry["level"], number> = {
		Mula: 0,
		Atthakatha: 1,
		Tika: 2,
		Other: 3,
	};

	return [...entries].sort((a, b) => {
		const levelDiff = levelOrder[a.level] - levelOrder[b.level];
		if (levelDiff !== 0) return levelDiff;
		if (a.orderHint !== b.orderHint) return a.orderHint - b.orderHint;
		return a.fileKey.localeCompare(b.fileKey);
	});
}

function createCategoryLookup(
	root: DirectoryNode,
	rootPage: PageWithContent,
): Map<string, number> {
	const pathMap = collectPathMap(root);
	const lookup = new Map<string, number>([["", rootPage.id]]);
	for (const [path, node] of pathMap.entries()) {
		if (!node.pageId) {
			throw new Error(`Category page missing pageId for path: ${path}`);
		}
		lookup.set(path, node.pageId);
	}
	return lookup;
}

function resolveCategoryPageId(
	segments: string[],
	categoryLookup: Map<string, number>,
): number {
	const key = segments.length === 0 ? "" : segments.join("/");
	const pageId = categoryLookup.get(key);
	if (typeof pageId !== "number") {
		throw new Error(`Category page not found for path: ${key || "(root)"}`);
	}
	return pageId;
}

export async function runTipitakaImport(): Promise<void> {
	const prisma = new PrismaClient();

	try {
		// Step 0: 取り込み先となるシステムユーザ（evame）が存在するか確認する
		const user = await prisma.user.findUnique({
			where: { handle: SYSTEM_USER_HANDLE },
		});
		if (!user) {
			throw new Error(
				`User with handle ${SYSTEM_USER_HANDLE} not found. Create user first.`,
			);
		}

		// Step 1: セグメント種別を upsert し、ルートページも最新状態にそろえる
		const segmentTypes = await ensureSegmentTypes(prisma);
		const segmentTypeIdMap = new Map(
			segmentTypes.map((item) => [item.key as SegmentType["key"], item.id]),
		);
		const primaryTypeId = segmentTypeIdMap.get("PRIMARY");
		if (!primaryTypeId) {
			throw new Error('Segment type "PRIMARY" not found');
		}

		const rootPage = await ensureRootPage(prisma, user.id, primaryTypeId);

		// Step 2: books.json から各ファイルのメタデータを取得し、ディレクトリツリーを作る
		const { entries } = await readBooksJson();
		const directoryRoot = buildDirectoryTree(entries, ROOT_TITLE);
		directoryRoot.pageId = rootPage.id;

		// Step 3a: 幅優先でカテゴリ階層（中間ページ）を作成していく
		const queue: Array<{ node: DirectoryNode; parentId: number }> = [];
		for (const child of getSortedChildren(directoryRoot)) {
			queue.push({ node: child, parentId: rootPage.id });
		}

		const nextDirectoryOrder = getOrderGenerator();

		for (const item of queue) {
			const { node, parentId } = item;
			const order = nextDirectoryOrder(parentId);
			await createDirectoryPage({
				prisma,
				node,
				parentId,
				userId: user.id,
				order,
				segmentTypeId: primaryTypeId,
			});
			for (const child of getSortedChildren(node)) {
				if (node.pageId) {
					queue.push({ node: child, parentId: node.pageId });
				}
			}
		}

		// Step 3c: 生成したカテゴリ階層を素早く引き当てられるようにマッピングする
		const categoryLookup = createCategoryLookup(directoryRoot, rootPage);
		const orderForParent = getOrderGenerator();
		const paragraphNumberToSegmentIdsByFile = new Map<
			string,
			Map<number, number[]>
		>();

		const sortedEntries = sortEntries(entries);

		const otherTypeId = segmentTypeIdMap.get("OTHER");
		if (!otherTypeId) {
			throw new Error('Segment type "OTHER" not found');
		}

		for (const entry of sortedEntries) {
			const parentPageId = resolveCategoryPageId(
				entry.resolvedDirSegments,
				categoryLookup,
			);
			const order = orderForParent(parentPageId);
			const levelKey = entry.level?.toUpperCase?.() ?? "";
			const segmentTypeId =
				segmentTypeIdMap.get(levelKey as SegmentType["key"]) ?? otherTypeId;

			const pageId = await createContentPage({
				prisma,
				entry,
				parentId: parentPageId,
				userId: user.id,
				order,
				segmentTypeId,
			});

			const paragraphNumberToSegmentIds =
				await buildParagraphNumberToSegmentIdsMap(prisma, pageId);
			paragraphNumberToSegmentIdsByFile.set(
				entry.fileKey.toLowerCase(),
				paragraphNumberToSegmentIds,
			);

			if (
				(levelKey === "ATTHAKATHA" || levelKey === "TIKA") &&
				entry.mulaFileKey
			) {
				const mulaParagraphNumberToSegmentIds =
					paragraphNumberToSegmentIdsByFile.get(
						entry.mulaFileKey.toLowerCase(),
					);
				if (mulaParagraphNumberToSegmentIds) {
					await linkSegmentsByParagraphNumber(
						prisma,
						paragraphNumberToSegmentIds,
						mulaParagraphNumberToSegmentIds,
					);
				}
			}
		}
	} finally {
		await prisma.$disconnect();
	}
}

const PARAGRAPH_NUMBER_REGEX = /§\s*(\d+)/g;

/**
 * ページ内の各セグメントから段落番号（§ N）を抽出し、
 * 段落番号 → セグメントIDの配列のマッピングを構築する
 */
async function buildParagraphNumberToSegmentIdsMap(
	prisma: PrismaClient,
	pageId: number,
): Promise<Map<number, number[]>> {
	const segments = await prisma.segment.findMany({
		where: { contentId: pageId },
		select: { id: true, text: true },
	});
	const paragraphNumberToSegmentIds = new Map<number, number[]>();
	for (const segment of segments) {
		PARAGRAPH_NUMBER_REGEX.lastIndex = 0;
		let match: RegExpExecArray | null = PARAGRAPH_NUMBER_REGEX.exec(
			segment.text,
		);
		while (match !== null) {
			const paragraphNumber = Number.parseInt(match[1] ?? "", 10);
			if (!Number.isFinite(paragraphNumber)) continue;
			const segmentIds = paragraphNumberToSegmentIds.get(paragraphNumber) ?? [];
			segmentIds.push(segment.id);
			paragraphNumberToSegmentIds.set(paragraphNumber, segmentIds);
			match = PARAGRAPH_NUMBER_REGEX.exec(segment.text);
		}
	}
	return paragraphNumberToSegmentIds;
}

/**
 * 注釈書（Atthakatha/Tika）と根本経典（Mula）の間で、
 * 同じ段落番号を持つセグメント同士をリンクする
 */
async function linkSegmentsByParagraphNumber(
	prisma: PrismaClient,
	commentaryParagraphMap: Map<number, number[]>,
	rootTextParagraphMap: Map<number, number[]>,
) {
	const segmentLinks: { fromSegmentId: number; toSegmentId: number }[] = [];
	for (const [
		paragraphNumber,
		commentarySegmentIds,
	] of commentaryParagraphMap) {
		const rootTextSegmentIds = rootTextParagraphMap.get(paragraphNumber);
		if (!rootTextSegmentIds || rootTextSegmentIds.length === 0) continue;
		for (const commentarySegmentId of commentarySegmentIds) {
			for (const rootTextSegmentId of rootTextSegmentIds) {
				segmentLinks.push({
					fromSegmentId: commentarySegmentId,
					toSegmentId: rootTextSegmentId,
				});
			}
		}
	}
	if (segmentLinks.length === 0) return;
	await prisma.segmentLink.createMany({
		data: segmentLinks,
		skipDuplicates: true,
	});
}
