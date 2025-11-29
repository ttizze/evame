import { type Prisma, PrismaClient, type SegmentType } from "@prisma/client";
import { readBooksJson } from "./books";
import { ROOT_TITLE, SYSTEM_USER_HANDLE } from "./constants";
import { buildDirectoryTree, collectPathMap } from "./directory-tree";
import { getOrderGenerator, getSortedChildren } from "./helpers";
import { ensureMetadataTypes } from "./metadata-types";
import { createContentPage, createDirectoryPage } from "./pages";
import { ensureRootPage } from "./root-page";
import {
	buildParagraphAnchorMap,
	buildParagraphSegmentMap,
	linkAnnotationSegments,
	type ParagraphAnchorMap,
} from "./segment-annotations";
import { ensureSegmentTypes } from "./segment-types";
import type { DirectoryNode, ImportEntry } from "./types";

type PageWithContent = Prisma.PageGetPayload<{ include: { content: true } }>;

/**
 * fileKeyから順序を抽出する（例: "s0101m.mul.xml" → 101）
 */
function extractOrderFromFileKey(fileKey: string): number {
	const match = fileKey.match(/\d+/);
	if (!match) return Number.MAX_SAFE_INTEGER;
	return Number.parseInt(match[0], 10);
}

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
		const orderA = extractOrderFromFileKey(a.fileKey);
		const orderB = extractOrderFromFileKey(b.fileKey);
		if (orderA !== orderB) return orderA - orderB;
		return a.fileKey.localeCompare(b.fileKey);
	});
}

/**
 * カテゴリページのパス → ページIDのルックアップマップを作成する
 *
 * @param root ディレクトリツリーのルートノード
 * @param rootPage ルートページ
 * @returns パス → ページIDのマッピング
 */
function createCategoryLookup(
	root: DirectoryNode,
	rootPage: PageWithContent,
): Map<string, number> {
	const pathMap = collectPathMap(root);
	const lookup = new Map<string, number>([["", rootPage.id]]);
	for (const [path, node] of pathMap.entries()) {
		if (!node.pageId) {
			continue;
		}
		lookup.set(path, node.pageId);
	}
	return lookup;
}

/**
 * ディレクトリセグメントからカテゴリページIDを解決する
 *
 * @param segments ディレクトリセグメントの配列
 * @param categoryLookup カテゴリルックアップマップ
 * @returns カテゴリページID
 */
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

		// メタデータタイプを確保
		await ensureMetadataTypes(prisma);

		const rootPage = await ensureRootPage(prisma, user.id, primaryTypeId);

		// Step 2: books.json から各ファイルのメタデータを取得し、ディレクトリツリーを作る
		const { entries } = await readBooksJson();
		const directoryRoot = buildDirectoryTree(entries, ROOT_TITLE);
		directoryRoot.pageId = rootPage.id;

		// Step 3a: 幅優先でカテゴリ階層（中間ページ）を作成していく
		const queue: Array<{
			node: DirectoryNode;
			parentId: number;
			path: string;
		}> = [];
		for (const child of getSortedChildren(directoryRoot)) {
			const path = child.segment;
			queue.push({ node: child, parentId: rootPage.id, path });
		}

		const nextDirectoryOrder = getOrderGenerator();

		for (const item of queue) {
			const { node, parentId, path } = item;
			if (node.children.size === 0) {
				continue;
			}
			const order = nextDirectoryOrder(parentId);
			await createDirectoryPage({
				prisma,
				node,
				directoryPath: path,
				parentId,
				userId: user.id,
				order,
				segmentTypeId: primaryTypeId,
			});
			for (const child of getSortedChildren(node)) {
				if (node.pageId) {
					const childPath = path ? `${path}/${child.segment}` : child.segment;
					queue.push({ node: child, parentId: node.pageId, path: childPath });
				}
			}
		}

		// Step 3c: 生成したカテゴリ階層を素早く引き当てられるようにマッピングする
		const categoryLookup = createCategoryLookup(directoryRoot, rootPage);
		const orderForParent = getOrderGenerator();
		const sortedEntries = sortEntries(entries);

		const otherTypeId = segmentTypeIdMap.get("Commentary");
		if (!otherTypeId) {
			throw new Error('Segment type "Commentary" not found');
		}

		// エントリをレベルごとにグループ化
		const entriesByLevel = new Map<ImportEntry["level"], ImportEntry[]>();
		for (const entry of sortedEntries) {
			const level = entry.level;
			const levelEntries = entriesByLevel.get(level);
			if (levelEntries) {
				levelEntries.push(entry);
			} else {
				entriesByLevel.set(level, [entry]);
			}
		}

		// レベルごとに順次処理（依存関係を保証）、レベル内では並列処理
		// Mula → Atthakatha → Tika → Other の順で処理することで、
		// 注釈書が参照するムーラのアンカーセグメントが確実に存在することを保証
		const levelOrder: ImportEntry["level"][] = [
			"Mula",
			"Atthakatha",
			"Tika",
			"Other",
		];
		const CONCURRENCY = 10; // 同時処理数

		// Mulaファイルの段落番号 → アンカーセグメントIDのマッピングを保存
		const anchorMapByMulaFile = new Map<string, ParagraphAnchorMap>();

		for (const level of levelOrder) {
			const levelEntries = entriesByLevel.get(level);
			if (!levelEntries || levelEntries.length === 0) continue;

			console.log(`Processing ${level} level: ${levelEntries.length} entries`);

			// バッチで並列処理
			for (let i = 0; i < levelEntries.length; i += CONCURRENCY) {
				const batch = levelEntries.slice(i, i + CONCURRENCY);
				await Promise.all(
					batch.map(async (entry) => {
						const directorySegments = entry.dirSegments.slice(0, -1);
						const parentPageId = resolveCategoryPageId(
							directorySegments,
							categoryLookup,
						);
						const order = orderForParent(parentPageId);
						const levelKey = entry.level?.toUpperCase?.() ?? "";
						const segmentTypeId =
							segmentTypeIdMap.get(levelKey as SegmentType["key"]) ??
							otherTypeId;

						const pageId = await createContentPage({
							prisma,
							entry,
							parentId: parentPageId,
							userId: user.id,
							order,
							segmentTypeId,
						});

						// ページのコンテンツIDを取得
						const page = await prisma.page.findUnique({
							where: { id: pageId },
							select: { contentId: true },
						});
						if (!page) return;

						// 段落番号でセグメントをグループ化
						const paragraphNumberToSegmentIds = await buildParagraphSegmentMap(
							prisma,
							page.contentId,
						);
						if (paragraphNumberToSegmentIds.size === 0) {
							return;
						}

						// Mula（根本経典）の場合: アンカーセグメントを特定して保存
						if (levelKey === "MULA") {
							const anchorMap = await buildParagraphAnchorMap(
								prisma,
								paragraphNumberToSegmentIds,
							);
							// 注釈書で参照できるようにマッピングを保存
							anchorMapByMulaFile.set(entry.fileKey.toLowerCase(), anchorMap);
							return;
						}

						// 注釈書の場合: Mulaのアンカーセグメントにリンク
						if (!entry.mulaFileKey) {
							return;
						}

						const anchorMap = anchorMapByMulaFile.get(
							entry.mulaFileKey.toLowerCase(),
						);
						if (!anchorMap) {
							console.warn(
								`Anchor map not found for mula file: ${entry.mulaFileKey}`,
							);
							return;
						}

						// 同じ段落番号のアンカーセグメントに注釈セグメントをリンク
						for (const [
							paragraphNumber,
							annotationSegmentIds,
						] of paragraphNumberToSegmentIds) {
							const mainSegmentId = anchorMap.get(paragraphNumber);
							if (!mainSegmentId) continue;

							await linkAnnotationSegments(
								prisma,
								annotationSegmentIds,
								mainSegmentId,
							);
						}
					}),
				);
				console.log(
					`  Processed ${Math.min(i + CONCURRENCY, levelEntries.length)}/${levelEntries.length} entries`,
				);
			}
		}
	} finally {
		await prisma.$disconnect();
	}
}
