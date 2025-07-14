import fs from "node:fs/promises";
import path from "node:path";
import { generateSlug } from "@/app/[locale]/_lib/generateーslug";

// Markdown → MDAST + SegmentDraft[] 変換ユーティリティ
import { markdownToMdastWithSegments } from "@/app/[locale]/_lib/markdown-to-mdast-with-segments";
// NOTE: プロジェクトの構成に合わせてパスを調整してください

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * 定数定義 ───────────────────────────────────────────────────────────────
 */
const SYSTEM_USER_HANDLE = "evame"; // ← デフォルトユーザ
const ROOT_SLUG = "tipitaka" as const;

/**
 * Markdown 文字列を解析する
 *  – heading       : 最初に現れる "# " 行
 *  – bulletLinks   : "* [text](path)" 形式の箇条書きリンクを抽出
 *  – paragraphs    : heading／リンク行／インラインリンクを除いた本文を段落ごとに分割
 */
function parseMarkdown(src: string) {
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
		// [Home] で始まるパンくず行は完全に無視
		if (/^\[Home].*/.test(line)) continue;

		bodyLines.push(line);
	}

	// 本文からインラインリンクを除去
	const bodyText = bodyLines
		.join("\n")
		.replace(/\[[^\]]+]\([^)]*\)/g, "")
		.replace(/\n{3,}/g, "\n\n");

	// 空行で段落を分割
	const paragraphs = bodyText
		.split(/\n{2,}/)
		.map((p) => p.trim())
		.filter(Boolean);

	return { heading, bulletLinks, paragraphs };
}

/**
 * README を解析して三蔵ページを生成し、リンク先のキューを返す
 */

interface QueueItem {
	path: string;
	parentId: number;
	order: number;
}

async function buildPitakaPages(params: {
	readmeMd: string;
	readmePath: string;
	tipitakaPageId: number;
	userId: string;
}): Promise<QueueItem[]> {
	const { readmeMd, readmePath, tipitakaPageId, userId } = params;

	const lines = readmeMd.split(/\r?\n/);
	const pitakaHeadRe = /^##\s+([^()]+)\s*\(/; // "## Vinayapiṭaka (V)" 等
	const bulletRe = /^\*\s+\[[^\]]+]\(([^)]+)\)/;

	let current: { id: number; order: number } | null = null;
	let pitakaOrder = 0;
	const queue: QueueItem[] = [];

	for (const line of lines) {
		const headMatch = pitakaHeadRe.exec(line);
		if (headMatch) {
			// 三蔵タイトル
			const title = headMatch[1].trim();
			const mdast = await markdownToMdastWithSegments({
				header: title,
				markdown: "",
			});

			const pitakaPage = await prisma.page.create({
				data: {
					slug: generateSlug(),
					parentId: tipitakaPageId,
					order: pitakaOrder,
					userId,
					mdastJson: mdast.mdastJson,
					status: "PUBLIC",
					sourceLocale: "pi",
				},
			});

			// Segment(0)
			await prisma.pageSegment.deleteMany({ where: { pageId: pitakaPage.id } });
			await prisma.pageSegment.create({
				data: {
					pageId: pitakaPage.id,
					number: 0,
					text: title,
					textAndOccurrenceHash: mdast.segments[0]?.hash ?? title,
				},
			});

			current = { id: pitakaPage.id, order: 0 };
			pitakaOrder += 1;
			continue;
		}

		// 箇条書き → 子ファイル
		if (current) {
			const b = bulletRe.exec(line);
			if (b) {
				const rel = b[1].trim();
				const abs = path.resolve(path.dirname(readmePath), rel);
				queue.push({ path: abs, parentId: current.id, order: current.order });
				current.order += 1;
			}
		}
	}

	return queue;
}

/**
 * エントリポイント ───────────────────────────────────────────────────────
 */
(async () => {
	// 1. ルート Page を保証し README を mdast 化
	const readmePath = path.resolve("tipitaka-md", "README.md");
	const readmeMd = await fs.readFile(readmePath, "utf8");
	const readmeParsed = await markdownToMdastWithSegments({
		header: "Tipitaka",
		markdown: readmeMd,
	});
	const user = await prisma.user.findUnique({
		where: {
			handle: SYSTEM_USER_HANDLE,
		},
	});
	if (!user) {
		throw new Error(`User with handle ${SYSTEM_USER_HANDLE} not found`);
	}

	const tipitakaPage = await prisma.page.upsert({
		where: { slug: ROOT_SLUG },
		update: {
			mdastJson: readmeParsed.mdastJson,
		},
		create: {
			slug: ROOT_SLUG,
			parentId: null,
			order: 0,
			userId: user?.id,
			mdastJson: readmeParsed.mdastJson,
			status: "PUBLIC",
			sourceLocale: "pi",
		},
	});

	// README セグメントを挿入（毎回置き換え）
	await prisma.pageSegment.deleteMany({ where: { pageId: tipitakaPage.id } });
	await prisma.pageSegment.createMany({
		data: readmeParsed.segments.map((s) => ({
			pageId: tipitakaPage.id,
			number: s.number,
			text: s.text,
			textAndOccurrenceHash: s.hash,
		})),
	});

	// 2. README から三蔵ページを作成し、リンク先をキューに積む
	const queue = await buildPitakaPages({
		readmeMd,
		readmePath,
		tipitakaPageId: tipitakaPage.id,
		userId: user.id,
	});

	const visited = new Set<string>();

	while (queue.length) {
		const { path: filePath, parentId, order } = queue.shift()!;
		if (visited.has(filePath)) continue;
		visited.add(filePath);

		const mdRaw = await fs.readFile(filePath, "utf8");
		const { heading, bulletLinks, paragraphs } = parseMarkdown(mdRaw);

		if (!heading) {
			console.warn("No heading found in", filePath);
			continue;
		}

		// cleaned markdown: paragraphs joined by blank line
		const cleanedMd = paragraphs.join("\n\n");
		const parsed = await markdownToMdastWithSegments({
			header: heading,
			markdown: cleanedMd,
		});

		// 3. upsert page
		const pageSlug = generateSlug();
		const page = await prisma.page.upsert({
			where: { slug: pageSlug },
			update: {
				mdastJson: parsed.mdastJson,
			},
			create: {
				slug: pageSlug,
				parentId,
				order,
				userId: user?.id,
				mdastJson: parsed.mdastJson,
			},
		});

		// 4. Segment を挿入（冪等性のため既存を削除）
		await prisma.pageSegment.deleteMany({ where: { pageId: page.id } });

		const segData = parsed.segments.map((s) => ({
			pageId: page.id,
			number: s.number,
			text: s.text,
			textAndOccurrenceHash: s.hash,
		}));
		if (segData.length) {
			await prisma.pageSegment.createMany({ data: segData });
		}

		// 5. 箇条書きリンクの順序で子をキューに追加
		bulletLinks.forEach((lnk, idx) => {
			const childAbs = path.resolve(path.dirname(filePath), lnk.href);
			queue.push({ path: childAbs, parentId: page.id, order: idx });
		});
	}

	console.log("インポートが完了しました");
	await prisma.$disconnect();
})();
