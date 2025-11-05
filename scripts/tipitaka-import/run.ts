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

// Step 3b: 生成済みディレクトリページのパスとページIDをマッピングする
function createCategoryLookup(
	root: DirectoryNode,
	rootPage: PageWithContent,
): Map<string, number> {
	const pathMap = collectPathMap(root);
	const lookup = new Map<string, number>();
	for (const [path, node] of pathMap.entries()) {
		if (!node.pageId) {
			throw new Error(`Category page missing pageId for path: ${path}`);
		}
		lookup.set(path, node.pageId);
	}
	lookup.set("", rootPage.id);
	return lookup;
}

// Step 4b: Markdown ファイルがぶら下がるカテゴリページのIDを取得する
function resolveCategoryPageId(
	segments: string[],
	categoryLookup: Map<string, number>,
): number {
	if (segments.length === 0) {
		const rootId = categoryLookup.get("");
		if (typeof rootId !== "number") {
			throw new Error("Root page id missing in category lookup.");
		}
		return rootId;
	}
	const key = segments.join("/");
	const pageId = categoryLookup.get(key);
	if (typeof pageId !== "number") {
		throw new Error(`Category page not found for path: ${key}`);
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
		const lookupSegmentTypeId = (key: SegmentType["key"]): number => {
			const id = segmentTypeIdMap.get(key);
			if (id === undefined) {
				throw new Error(`Segment type "${key}" not found`);
			}
			return id;
		};

		const rootPage = await ensureRootPage(
			prisma,
			user.id,
			lookupSegmentTypeId("PRIMARY"),
		);

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

		while (queue.length > 0) {
			const item = queue.shift();
			if (!item) break;
			const { node, parentId } = item;
			const order = nextDirectoryOrder(parentId);
			await createDirectoryPage({
				prisma,
				node,
				parentId,
				userId: user.id,
				order,
				segmentTypeId: lookupSegmentTypeId("PRIMARY"),
			});
			for (const child of getSortedChildren(node)) {
				if (!node.pageId) continue;
				queue.push({ node: child, parentId: node.pageId });
			}
		}

		// Step 3c: 生成したカテゴリ階層を素早く引き当てられるようにマッピングする
		const categoryLookup = createCategoryLookup(directoryRoot, rootPage);
		const orderForParent = getOrderGenerator();
		const paragraphMapByFile = new Map<string, Map<number, number[]>>();

		const sortedEntries = sortEntries(entries);

		for (const entry of sortedEntries) {
			const parentPageId = resolveCategoryPageId(
				entry.resolvedDirSegments,
				categoryLookup,
			);
			const order = orderForParent(parentPageId);
			const upper = entry.level?.toUpperCase?.() ?? "";
			const levelKey = segmentTypeIdMap.has(upper as SegmentType["key"])
				? (upper as SegmentType["key"])
				: "OTHER";
			const segmentTypeId = lookupSegmentTypeId(levelKey);
			const pageId = await createContentPage({
				prisma,
				entry,
				parentId: parentPageId,
				userId: user.id,
				order,
				segmentTypeId,
			});
			const paragraphMap = await collectParagraphSegments(prisma, pageId);
			paragraphMapByFile.set(entry.fileKey.toLowerCase(), paragraphMap);
			if (
				(levelKey === "ATTHAKATHA" || levelKey === "TIKA") &&
				entry.mulaFileKey
			) {
				const mulaMap = paragraphMapByFile.get(entry.mulaFileKey.toLowerCase());
				if (mulaMap) {
					await linkParagraphs(prisma, paragraphMap, mulaMap);
				}
			}
		}
	} finally {
		await prisma.$disconnect();
	}
}

const PARAGRAPH_REGEX = /§\s*(\d+)/g;

async function collectParagraphSegments(
	prisma: PrismaClient,
	pageId: number,
): Promise<Map<number, number[]>> {
	const segments = await prisma.segment.findMany({
		where: { contentId: pageId },
		select: { id: true, text: true },
	});
	const map = new Map<number, number[]>();
	for (const seg of segments) {
		PARAGRAPH_REGEX.lastIndex = 0;
		let match: RegExpExecArray | null = PARAGRAPH_REGEX.exec(seg.text);
		while (match !== null) {
			const value = Number.parseInt(match[1] ?? "", 10);
			if (!Number.isFinite(value)) continue;
			const bucket = map.get(value) ?? [];
			bucket.push(seg.id);
			map.set(value, bucket);
			match = PARAGRAPH_REGEX.exec(seg.text);
		}
	}
	return map;
}

async function linkParagraphs(
	prisma: PrismaClient,
	fromMap: Map<number, number[]>,
	toMap: Map<number, number[]>,
) {
	const data: { fromSegmentId: number; toSegmentId: number }[] = [];
	for (const [para, fromIds] of fromMap) {
		const targets = toMap.get(para);
		if (!targets || targets.length === 0) continue;
		for (const fromId of fromIds) {
			for (const toId of targets) {
				data.push({ fromSegmentId: fromId, toSegmentId: toId });
			}
		}
	}
	if (data.length === 0) return;
	await prisma.segmentLink.createMany({ data, skipDuplicates: true });
}
