import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

// Markdown → MDAST + SegmentDraft[] 変換ユーティリティ
import { markdownToMdastWithSegments } from "@/app/[locale]/_lib/markdown-to-mdast-with-segments";
import type { SegmentDraft } from "@/app/[locale]/_lib/remark-hash-and-segments";
import { syncSegments } from "@/app/[locale]/_lib/sync-segments";

// NOTE: プロジェクトの構成に合わせてパスを調整してください

import type { Prisma } from "@prisma/client";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

/**
 * 定数定義 ───────────────────────────────────────────────────────────────
 * ここで扱うスクリプト固有の前提値。
 * - SYSTEM_USER_HANDLE: DB 上で Tipitaka ページの所有者として使うユーザー
 * - ROOT_SLUG: ルートページのスラッグを固定（再実行時も一致させるため）
 * - TIPITAKA_ROOT_DIR: Markdown 原稿のルート。README や子ファイルへの相対計算に利用
 */
const SYSTEM_USER_HANDLE = "evame"; // ← デフォルトユーザ
const ROOT_SLUG = "tipitaka" as const;
const TIPITAKA_ROOT_DIR = path.resolve("tipitaka-md");

type CreatePageData = Omit<Prisma.PageUncheckedCreateInput, "id">;

// Content→Page の生成をワンセットで行う。戻り値に content リレーションを含める。
async function createPageWithNewContent(data: CreatePageData) {
	const content = await prisma.content.create({ data: { kind: "PAGE" } });
	return await prisma.page.create({
		data: {
			...data,
			id: content.id,
		},
		include: { content: true },
	});
}

// ラベル文字列を URL で使いやすい ASCII へ正規化（決定的 slug の一部に利用）
function toAsciiSlug(value: string) {
	const normalized = value
		.normalize("NFKD")
		.replace(/[^\w\s-]+/g, "")
		.trim()
		.replace(/[-\s]+/g, "")
		.toLowerCase();
	return normalized.slice(0, 48);
}

// key をハッシュ化しつつ読みやすいラベルを残した決定的 slug を生成
export function buildDeterministicSlug(key: string, label: string) {
	const hash = createHash("sha1").update(key).digest("hex").slice(0, 10);
	const slugLabel = toAsciiSlug(label);
	return `${slugLabel}-${hash}`;
}

/**
 * Markdown 文字列を解析する
 *  – heading       : 最初に現れる "# " 行
 *  – bulletLinks   : "* [text](path)" 形式の箇条書きリンクを抽出
 *  – paragraphs    : heading／リンク行／インラインリンクを除いた本文を段落ごとに分割
 */
export function parseMarkdown(src: string) {
	const lines = src.split(/\r?\n/);
	let heading = "";
	const bulletLinks: { text: string; href: string }[] = [];
	const bodyLines: string[] = [];

	const bulletRe = /^\*\s+\[([^\]]+)]\(([^)]+)\)/;
	const headingRe = /^#\s+(.*)$/;

	for (const line of lines) {
		if (!heading) {
			const m = headingRe.exec(line);
			if (m) {
				heading = m[1].trim();
				continue; // 本文には含めない
			}
		}
		const bm = bulletRe.exec(line);
		if (bm) {
			bulletLinks.push({ text: bm[1].trim(), href: bm[2].trim() });
			continue; // 箇条書きリンク行は本文に含めない
		}

		// 純粋な番号行 ("(24.)" や "41.") は無視
		if (/^\(?\d+\.?\)?\s*$/.test(line.trim())) {
			continue;
		}

		bodyLines.push(line);
	}

	const enumNumRe = /(\(\d+\\?\.\)|\(\d+\)|\d+\\?\.)/g;
	const splitEmDashRe = /—\s+“/g; // emダッシュ後に開き引用符
	const splitTiRe = /”ti[?.]?\s+“/g; // ”ti? のあとに開き引用符

	const cleanedBodyLines: string[] = [];
	for (const ln of bodyLines) {
		// 1) インラインリンク除去
		let x = ln.replace(/\[[^\]]+]\([^)]*\)/g, "");
		// 2) 数字プレフィックス除去
		// 3) 行内の列挙番号 ((123.), (123), 123., 123\.) を除去
		x = x.replace(enumNumRe, "");

		// 4) パターンに応じて改行を挿入
		x = x
			.replace(splitEmDashRe, "—\n\n“")
			.replace(splitTiRe, (m) => m.replace(/\s+“$/, "\n\n“"));

		// 5) 改行が入ったら分割して配列へ
		cleanedBodyLines.push(...x.split("\n"));
	}

	const bodyText = cleanedBodyLines.join("\n").replace(/\n{3,}/g, "\n\n");

	// 空行で段落を分割
	const paragraphs = bodyText
		.split(/\n{2,}/)
		.map((p) => p.trim())
		.filter(Boolean);

	return { heading, bulletLinks, paragraphs };
}

/**
 * README を解析して階層ページを生成し、リンク先のキューを返す
 */

// 決定的な key 情報から Page を upsert し、セグメントまで同期する
export async function ensureTipitakaPage(params: {
	key: string;
	label: string;
	parentId: number | null;
	order: number;
	userId: string;
	mdastJson: Prisma.InputJsonValue;
	segments: SegmentDraft[];
	fallbackTitle?: string;
}) {
	const {
		key,
		label,
		parentId,
		order,
		userId,
		mdastJson,
		segments,
		fallbackTitle,
	} = params;

	const slug = buildDeterministicSlug(key, label || fallbackTitle || "");

	let page = await prisma.page.findUnique({
		where: { slug },
		include: { content: true },
	});

	if (!page && fallbackTitle) {
		const parentFilter =
			parentId === null
				? { parentId: null }
				: { parentId: parentId ?? undefined };
		const candidate = await prisma.page.findFirst({
			where: {
				...parentFilter,
				content: {
					segments: {
						some: {
							number: 0,
							text: fallbackTitle,
						},
					},
				},
			},
			include: { content: true },
		});
		if (candidate) {
			page = await prisma.page.update({
				where: { id: candidate.id },
				data: { slug },
				include: { content: true },
			});
		}
	}

	if (!page) {
		console.log("createPageWithNewContent", key);
		page = await createPageWithNewContent({
			slug,
			parentId,
			order,
			userId,
			mdastJson,
			status: "PUBLIC",
			sourceLocale: "pi",
		});
	} else {
		page = await prisma.page.update({
			where: { id: page.id },
			data: {
				parentId,
				order,
				mdastJson,
			},
			include: { content: true },
		});
	}

	if (!page) {
		throw new Error("Failed to ensure Tipitaka page");
	}

	// textAndOccurrenceHash をキーに本文セグメントを同期（翻訳との紐付け維持）
	await syncSegments(prisma, page.id, segments);

	return page;
}

/**
 * Markdown ファイル取り込みのためのキュー要素。
 * - `relativePath` は Tipitaka ルートからの相対パス（slug 決定用）
 * - `fallbackTitle` は Markdown 内に見出しが無い場合に使うページタイトル
 */
interface QueueItem {
	path: string;
	relativePath: string;
	parentId: number;
	order: number;
	fallbackTitle: string;
}

/**
 * README から得たキューを BFS 的に処理し、ページを作成・更新する。
 * `childOrderCounters` は各親ページの子順序を保持し、本文中リンクも決定的順序で挿入する。
 */
async function processMarkdownQueue(params: {
	queue: QueueItem[];
	userId: string;
}) {
	const { queue, userId } = params;
	const visited = new Set<string>(); // 同一ファイルを重複処理しないよう監視
	const childOrderCounters = new Map<number, number>(); // page.id ごとの子順序カウンタ

	while (queue.length) {
		// FIFO で取り出すことで、親で見つけた子ファイルを順番に処理（BFS）できる
		const item = queue.shift();
		if (!item) continue;
		if (visited.has(item.path)) continue;
		visited.add(item.path);

		const childItems = await processMarkdownQueueItem({
			item,
			userId,
			childOrderCounters,
		});
		// 現在のファイルで見つかった子リンクをキュー末尾に積み、後で順番に処理する
		queue.push(...childItems);
	}
}

/**
 * 単一 Markdown を DB に同期し、新たに見つかった子リンクを QueueItem として返す。
 */
async function processMarkdownQueueItem(params: {
	item: QueueItem;
	userId: string;
	childOrderCounters: Map<number, number>;
}): Promise<QueueItem[]> {
	const { item, userId, childOrderCounters } = params;
	const { path: filePath, relativePath, parentId, order, fallbackTitle } = item;

	const mdRaw = await fs.readFile(filePath, "utf8");
	const parsedMd = parseMarkdown(mdRaw);
	const heading = parsedMd.heading || fallbackTitle;
	const cleanedMd = parsedMd.paragraphs.join("\n\n");

	const parsed = await markdownToMdastWithSegments({
		header: heading,
		markdown: cleanedMd,
	});

	const keyBase = (relativePath || path.basename(filePath))
		.replace(/\\/g, "/")
		.toLowerCase();
	const key = `file::${keyBase}`;
	const page = await ensureTipitakaPage({
		key,
		label: heading,
		parentId,
		order,
		userId,
		mdastJson: parsed.mdastJson,
		segments: parsed.segments,
		fallbackTitle: heading,
	});

	// 子ページの order を続きから振るため、親ページごとのカウンタを参照
	const startOrder = childOrderCounters.get(page.id) ?? 0;
	const childItems = parsedMd.bulletLinks.map((lnk, idx) => {
		const childAbs = path.resolve(path.dirname(filePath), lnk.href);
		const childRelative = path
			.relative(TIPITAKA_ROOT_DIR, childAbs)
			.replace(/\\/g, "/");

		return {
			path: childAbs,
			relativePath: childRelative,
			parentId: page.id,
			order: startOrder + idx,
			fallbackTitle: lnk.text,
		};
	});

	// 今回追加した子要素分だけカウンタを進め、次回以降の order を安定化
	childOrderCounters.set(page.id, startOrder + childItems.length);
	return childItems;
}

// README（ルート目次）から最初の処理キューを構築する。
// README 自体はトップページとして DB に同期済みなので、ここでは箇条書きリンクを列挙して
// Tipitaka ルート配下にぶら下がる子 Markdown を QueueItem に変換するだけで良い。
async function buildInitialQueueFromReadme(params: {
	readmeMd: string;
	readmePath: string;
	tipitakaPageId: number;
}): Promise<QueueItem[]> {
	const { readmeMd, readmePath, tipitakaPageId } = params;
	const readmeDir = path.dirname(readmePath);
	const parsed = parseMarkdown(readmeMd);

	return parsed.bulletLinks.map((lnk, index) => {
		const childAbs = path.resolve(readmeDir, lnk.href);
		const childRelative = path
			.relative(TIPITAKA_ROOT_DIR, childAbs)
			.replace(/\\/g, "/");

		return {
			path: childAbs,
			relativePath: childRelative,
			parentId: tipitakaPageId,
			order: index,
			fallbackTitle: lnk.text,
		};
	});
}

// 新規: Tipitaka ルートページを作成／更新するユーティリティ
async function ensureRootPage() {
	// ルート Page を保証し README を mdast 化
	const readmePath = path.resolve("tipitaka-md", "README.md");
	const rawReadmeMd = await fs.readFile(readmePath, "utf8");

	// bullet 行やインラインリンクを除去してテキストだけを抽出
	const { paragraphs } = parseMarkdown(rawReadmeMd);
	// README 内のカテゴリー見出し (##, ### など) はセグメントに含めたくないため除外
	const cleanedReadmeMd = paragraphs
		.filter((p) => !/^##+\s+/.test(p))
		.join("\n\n");

	const readmeParsed = await markdownToMdastWithSegments({
		header: "Tipitaka",
		markdown: cleanedReadmeMd,
	});

	const user = await prisma.user.findUnique({
		where: { handle: SYSTEM_USER_HANDLE },
	});
	if (!user) {
		throw new Error(`User with handle ${SYSTEM_USER_HANDLE} not found`);
	}

	// Check if root page already exists
	let tipitakaPage = await prisma.page.findUnique({
		where: { slug: ROOT_SLUG },
		include: { content: true },
	});

	if (tipitakaPage) {
		tipitakaPage = await prisma.page.update({
			where: { id: tipitakaPage.id },
			data: { mdastJson: readmeParsed.mdastJson },
			include: { content: true },
		});
	} else {
		tipitakaPage = await createPageWithNewContent({
			slug: ROOT_SLUG,
			parentId: null,
			order: 0,
			userId: user.id,
			mdastJson: readmeParsed.mdastJson,
			status: "PUBLIC",
			sourceLocale: "pi",
		});
	}

	if (!tipitakaPage) {
		throw new Error("Tipitaka root page not found");
	}

	await syncSegments(prisma, tipitakaPage.id, readmeParsed.segments);

	return { readmeMd: rawReadmeMd, readmePath, tipitakaPage, user };
}

/**
 * エントリポイント ───────────────────────────────────────────────────────
 * - ルート README を DB と同期（トップページ + 著者ユーザ）
 * - README の階層を解析し、各ファイルを取り込みキューへ積む
 * - BFS で全 Markdown を走査し、決定的キーで Page/Segment を upsert
 */
export async function run() {
	// 1. ルート Page を保証し README を mdast 化
	const { readmeMd, readmePath, tipitakaPage, user } = await ensureRootPage();

	// 2. README からカテゴリー/Leaf ページを作成し、リンク先をキューに積む
	const queue = await buildInitialQueueFromReadme({
		readmeMd,
		readmePath,
		tipitakaPageId: tipitakaPage.id,
	});

	await processMarkdownQueue({ queue, userId: user.id });

	console.log("インポートが完了しました");
	await prisma.$disconnect();
}

run().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
