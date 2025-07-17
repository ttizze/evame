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

		// リンクを伴わない bullet 行（上位構造の見出しなど）も無視
		if (/^\*\s+[^[]/.test(line)) {
			continue;
		}

		// パンくずナビゲーション行は完全に無視
		if (
			/^\[Home].*/.test(line) ||
			/Go to (previous|parent|next) page/.test(line)
		) {
			continue;
		}

		// 純粋な番号行 ("(24.)" や "41.") は無視
		if (/^\(?\d+\.?\)?\s*$/.test(line.trim())) {
			continue;
		}

		bodyLines.push(line);
	}

	// 行ごとに前処理: インラインリンク除去 & 番号プレフィックス除去
	const linePrefixRe = /^\s*(?:\(\d+\.\)|\d+\\?\.)\s*/;
	const cleanedBodyLines = bodyLines.map((ln) => {
		let x = ln.replace(/\[[^\]]+]\([^)]*\)/g, ""); // インラインリンク除去
		x = x.replace(linePrefixRe, ""); // 番号プレフィックス除去
		return x;
	});

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

interface QueueItem {
	path: string;
	pageId: number;
	fallbackTitle: string;
}

async function buildPagesFromReadme(params: {
	readmeMd: string;
	readmePath: string;
	tipitakaPageId: number;
	userId: string;
}): Promise<QueueItem[]> {
	const { readmeMd, readmePath, tipitakaPageId, userId } = params;

	const headingRe = /^(#{2,})\s+(.*)$/; // ##, ###, #### ...
	const bulletRe = /^\*\s+\[([^\]]+)]\(([^)]+)\)/;

	// stack[0] は root "tipitaka"
	interface StackItem {
		id: number;
		orderCounter: number;
	}
	const stack: StackItem[] = [{ id: tipitakaPageId, orderCounter: 0 }];

	const queue: QueueItem[] = [];

	const lines = readmeMd.split(/\r?\n/);

	for (const line of lines) {
		// 1) Heading
		const h = headingRe.exec(line);
		if (h) {
			const hashes = h[1];
			const depth = hashes.length; // ## → 2, ### → 3 ...
			const title = h[2].trim();

			// depth 2 should be child of root (stack length 1). So we want stack len = depth-1 after adjustment
			while (stack.length >= depth) {
				stack.pop();
			}

			const parent = stack[stack.length - 1];
			const mdast = await markdownToMdastWithSegments({
				header: title,
				markdown: "",
			});

			const page = await prisma.page.create({
				data: {
					slug: generateSlug(),
					parentId: parent.id,
					order: parent.orderCounter,
					userId,
					mdastJson: mdast.mdastJson,
					status: "PUBLIC",
					sourceLocale: "pi",
				},
			});

			// Segment(0) = title (本文なし)
			await prisma.pageSegment.deleteMany({ where: { pageId: page.id } });
			await prisma.pageSegment.create({
				data: {
					pageId: page.id,
					number: 0,
					text: title,
					textAndOccurrenceHash: mdast.segments[0]?.hash ?? title,
				},
			});

			// 新しい深さのStackItem 追加
			stack.push({ id: page.id, orderCounter: 0 });
			parent.orderCounter += 1;

			continue; // 次の行へ
		}

		// 2) Bullet link
		const bl = bulletRe.exec(line);
		if (bl) {
			const linkTitle = bl[1].trim();
			const relHref = bl[2].trim();
			const abs = path.resolve(path.dirname(readmePath), relHref);

			const parent = stack[stack.length - 1];

			// Create placeholder page
			const leafPage = await prisma.page.create({
				data: {
					slug: generateSlug(),
					parentId: parent.id,
					order: parent.orderCounter,
					userId,
					mdastJson: "", // later fill
					status: "PUBLIC",
					sourceLocale: "pi",
				},
			});

			await prisma.pageSegment.deleteMany({ where: { pageId: leafPage.id } });
			await prisma.pageSegment.create({
				data: {
					pageId: leafPage.id,
					number: 0,
					text: linkTitle,
					textAndOccurrenceHash: linkTitle,
				},
			});

			queue.push({ path: abs, pageId: leafPage.id, fallbackTitle: linkTitle });
			parent.orderCounter += 1;
		}
	}

	return queue;
}

// 新規: Tipitaka ルートページを作成／更新するユーティリティ
async function ensureRootPage() {
	// ルート Page を保証し README を mdast 化
	const readmePath = path.resolve("tipitaka-md", "README.md");
	const rawReadmeMd = await fs.readFile(readmePath, "utf8");

	// bullet 行やインラインリンクを除去してテキストだけを抽出
	const { paragraphs } = parseMarkdown(rawReadmeMd);
	const cleanedReadmeMd = paragraphs.join("\n\n");

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

	const tipitakaPage = await prisma.page.upsert({
		where: { slug: ROOT_SLUG },
		update: {
			mdastJson: readmeParsed.mdastJson,
		},
		create: {
			slug: ROOT_SLUG,
			parentId: null,
			order: 0,
			userId: user.id,
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

	return { readmeMd: rawReadmeMd, readmePath, tipitakaPage, user };
}

/**
 * エントリポイント ───────────────────────────────────────────────────────
 */
(async () => {
	// 1. ルート Page を保証し README を mdast 化
	const { readmeMd, readmePath, tipitakaPage, user } = await ensureRootPage();

	// 2. README からカテゴリー/Leaf ページを作成し、リンク先をキューに積む
	const queue = await buildPagesFromReadme({
		readmeMd,
		readmePath,
		tipitakaPageId: tipitakaPage.id,
		userId: user.id,
	});

	const visited = new Set<string>();

	while (queue.length) {
		const { path: filePath, pageId, fallbackTitle } = queue.shift()!;
		if (visited.has(filePath)) continue;
		visited.add(filePath);

		const mdRaw = await fs.readFile(filePath, "utf8");
		const parsedMd = parseMarkdown(mdRaw);
		let heading = parsedMd.heading;
		const bulletLinks = parsedMd.bulletLinks;
		const paragraphs = parsedMd.paragraphs;

		if (!heading) {
			heading = fallbackTitle;
		}

		// cleaned markdown: paragraphs joined by blank line
		const cleanedMd = paragraphs.join("\n\n");
		const parsed = await markdownToMdastWithSegments({
			header: heading,
			markdown: cleanedMd,
		});

		// 3. update placeholder page with actual content
		await prisma.page.update({
			where: { id: pageId },
			data: { mdastJson: parsed.mdastJson },
		});

		// 4. Segment を挿入（冪等性のため既存を削除）
		await prisma.pageSegment.deleteMany({ where: { pageId } });

		const segData = parsed.segments.map((s) => ({
			pageId,
			number: s.number,
			text: s.text,
			textAndOccurrenceHash: s.hash,
		}));
		if (segData.length) {
			await prisma.pageSegment.createMany({ data: segData });
		}

		// 5. 箇条書きリンクの順序で子をキューに追加
		for (let idx = 0; idx < bulletLinks.length; idx++) {
			const lnk = bulletLinks[idx];
			const childAbs = path.resolve(path.dirname(filePath), lnk.href);
			const childTitle = lnk.text;

			const childPage = await prisma.page.create({
				data: {
					slug: generateSlug(),
					parentId: pageId,
					order: idx,
					userId: user.id,
					mdastJson: "",
					status: "PUBLIC",
					sourceLocale: "pi",
				},
			});

			await prisma.pageSegment.deleteMany({ where: { pageId: childPage.id } });
			await prisma.pageSegment.create({
				data: {
					pageId: childPage.id,
					number: 0,
					text: childTitle,
					textAndOccurrenceHash: childTitle,
				},
			});

			queue.push({
				path: childAbs,
				pageId: childPage.id,
				fallbackTitle: childTitle,
			});
		}
	}

	console.log("インポートが完了しました");
	await prisma.$disconnect();
})();
