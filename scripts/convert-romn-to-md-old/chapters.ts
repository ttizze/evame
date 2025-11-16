import * as path from "node:path";
import {
	extractChapterHeadingInfo,
	extractTextByRend,
	extractTextContent,
	findElementByRend,
	getChildElements,
	normalizeTagName,
} from "./tei";
import type { Chapter } from "./types";

// このファイルは convert-romn-to-md の章抽出処理をまとめたもの。
// book 構造や線形本文など XML の違いを吸収して `Chapter` を組み立てる。

// ファイル共通の前書きを最初の章に付け替える。
// `<body>` 先頭から最初の章 `<div>` の直前までを拾う。
export function extractBodyFrontMatter(body: Element): Element[] {
	const nodes: Element[] = [];
	for (const child of getChildElements(body)) {
		if (normalizeTagName(child.tagName) === "div") {
			break;
		}
		nodes.push(child);
	}
	return nodes;
}

// navSegments/navOrders は撤廃。分類ディレクトリは Chapter.dirSegments に集約。

// book `<div>` ごとに章を取り出し `Chapter` の配列を作る。
// frontMatter や book 固有の前書きをまとめて書名付きの `Chapter` に整える。
function extractChaptersFromBookDiv(
	bookDiv: Element,
	frontMatter: Element[] | undefined,
): Chapter[] {
	// book の前書きと本文の境目をつかむために子要素と章<div>の位置を調べる。
	const bookChildren = getChildElements(bookDiv);
	const chapterDivPositions = computeChapterDivPositions(bookDiv);
	const bookPrefaceNodes = extractBookPrefaceNodes(
		bookDiv,
		chapterDivPositions,
		bookChildren,
	);

	// 書籍タイトルは前書きの `rend="book"` を優先し、無ければ book 内や `n` 属性から拾う。
	const bookTitle = resolveBookTitleFromBook(bookDiv, bookPrefaceNodes);

	const frontMatterNodes = frontMatter ?? [];
	if (chapterDivPositions.length === 0) {
		// 章 `<div>` が無い場合も線形走査で章を組み立て、全体前書きを先頭章に寄せる。
		const linearChapters = extractChaptersFromLinearBody(bookDiv, bookTitle);
		if (linearChapters.length > 0 && frontMatterNodes.length > 0) {
			linearChapters[0].prefaceNodes = [
				...frontMatterNodes,
				...linearChapters[0].prefaceNodes,
			];
		}
		return linearChapters;
	}

	return buildChaptersFromDivPositions(
		bookDiv,
		chapterDivPositions,
		bookTitle,
		[...frontMatterNodes, ...bookPrefaceNodes],
	);
}

// `<body>` に book 構造がある場合に章データへ展開し、books.json の分類情報を保つ。
// `<div type="book">` を順に解析して分類コンテキストと `frontMatter` を各章へ引き渡す。
function extractChaptersFromBodyBooks(
	body: Element,
	frontMatter: Element[],
): Chapter[] | null {
	const bodyChildren = getChildElements(body);
	const bookDivs = bodyChildren.filter(
		(child) =>
			normalizeTagName(child.tagName) === "div" &&
			(child.getAttribute("type") ?? "").toLowerCase() === "book",
	);

	if (bookDivs.length === 0) {
		return null;
	}

	const [firstBook, ...otherBooks] = bookDivs;
	const firstChapters = extractChaptersFromBookDiv(firstBook, frontMatter);
	const otherChapters = otherBooks.flatMap((bookDiv) =>
		extractChaptersFromBookDiv(bookDiv, undefined),
	);

	return [...firstChapters, ...otherChapters];
}

// book 構造が無いときは `<body>` 直下の章 `<div>` から取り出して分類コンテキストを保つ。
// ここでも分類情報と `frontMatter` をそのまま渡す。
function extractChaptersFromBodyDivs(
	body: Element,
	frontMatter: Element[],
): Chapter[] | null {
	// `<body>` 直下の章 `<div>` の位置（index）を拾い出す
	const indices = computeChapterDivPositions(body);
	if (indices.length === 0) {
		return null;
	}

	// 書名の決定（前書きの book、無ければ `n` 属性）
	const bookTitle = resolveBookTitleFromBody(body);

	return buildChaptersFromDivPositions(body, indices, bookTitle, [
		...frontMatter,
	]);
}

// 目的: 章 `<div>` の位置配列から Chapter 配列を生成する共通処理。
// 処理: 各章で見出しを抽出・本文から除外し、最初の章にだけ追加前書きを付ける。
function buildChaptersFromDivPositions(
	container: Element,
	positions: number[],
	bookTitle: string,
	firstChapterPreface: Element[],
): Chapter[] {
	const children = getChildElements(container);
	return positions.map((chapterPos, idx) => {
		const chapterContainer = children[chapterPos];
		const { node: headingElement, text: headingText } =
			extractChapterHeadingInfo(chapterContainer);
		const title =
			headingText && headingText.length > 0
				? headingText
				: `Chapter ${idx + 1}`;
		const chapterChildElements = getChildElements(chapterContainer);
		const filteredChildren = headingElement
			? chapterChildElements.filter((node) => node !== headingElement)
			: [...chapterChildElements];
		const prefaceNodes = idx === 0 ? [...firstChapterPreface] : [];
		return {
			book: bookTitle,
			title,
			order: idx + 1,
			prefaceNodes,
			contentNodes: filteredChildren,
		};
	});
}

// 目的: 章 `<div>` の位置を抽出する共通処理。
// 処理: 直下の子で `div` かつ内側に `rend="chapter"` を含むものの index を返す。
function computeChapterDivPositions(container: Element): number[] {
	const positions: number[] = [];
	getChildElements(container).forEach((child, index) => {
		if (
			normalizeTagName(child.tagName) === "div" &&
			findElementByRend(child, "chapter") !== null
		) {
			positions.push(index);
		}
	});
	return positions;
}

// 目的: body 要素から書名を解決する共通処理。
function resolveBookTitleFromBody(body: Element): string {
	return (
		extractTextByRend(body, "book") ?? body.getAttribute("n") ?? "unknown-book"
	);
}

// 目的: bookDiv から書名を解決する共通処理。
// 処理: 前書きにある book 見出しを優先し、無ければ book 内の見出し、無ければ `n` 属性。
function resolveBookTitleFromBook(
	bookDiv: Element,
	bookPrefaceNodes?: Element[],
	bodyForFallback?: Element,
): string {
	const preferred = bookPrefaceNodes?.find((node) => {
		const tag = normalizeTagName(node.tagName);
		const rend = (node.getAttribute("rend") ?? "").toLowerCase();
		return (tag === "head" || tag === "p") && rend === "book";
	});
	const heading = preferred ?? findElementByRend(bookDiv, "book");
	if (heading) {
		const text = extractTextContent(heading).replace(/\s+/g, " ").trim();
		if (text.length > 0) return text;
	}
	return (
		bookDiv.getAttribute("n") ??
		(bodyForFallback ? resolveBookTitleFromBody(bodyForFallback) : undefined) ??
		"unknown-book"
	);
}

// 目的: bookDiv の前書きノード（最初の章<div>手前まで）を抽出する共通処理。
function extractBookPrefaceNodes(
	bookDiv: Element,
	chapterPositions: number[],
	bookChildren?: Element[],
): Element[] {
	const children = bookChildren ?? getChildElements(bookDiv);
	const firstChapterPosition =
		chapterPositions.length > 0 ? chapterPositions[0] : children.length;
	return children.slice(0, firstChapterPosition);
}

// book 構造も章 `<div>` も無い本文を順番に走査して章を組み立てる。
// `rend` 属性などを手がかりに区切りを見つけつつ分類コンテキストを引き回す。
function extractChaptersFromLinearBody(
	body: Element,
	defaultBook: string,
): Chapter[] {
	const chapters: Chapter[] = [];
	const preface: Element[] = [];
	const bookCounters = new Map<string, number>();
	let currentBook = defaultBook;
	let started = false;
	let currentContent: Element[] | null = null;

	const startChapter = (titleElement: Element) => {
		const titleText = extractTextContent(titleElement)
			.replace(/\s+/g, " ")
			.trim();
		const order = (bookCounters.get(currentBook) ?? 0) + 1;
		bookCounters.set(currentBook, order);
		const chapter: Chapter = {
			book: currentBook,
			title: titleText || `Chapter ${order}`,
			order,
			prefaceNodes: chapters.length === 0 ? [...preface] : [],
			contentNodes: [],
		};
		chapters.push(chapter);
		started = true;
		currentContent = chapter.contentNodes;
	};

	for (const element of getChildElements(body)) {
		const tag = normalizeTagName(element.tagName);
		const rend = (element.getAttribute("rend") ?? "").toLowerCase();

		if (tag === "p" || tag === "head") {
			if (!started && rend === "nikaya") {
				preface.push(element);
				continue;
			}
			if (!started && rend === "book") {
				const text = extractTextContent(element).replace(/\s+/g, " ").trim();
				currentBook = text.length > 0 ? text : currentBook;
				preface.push(element);
				continue;
			}
			if (rend === "chapter") {
				startChapter(element);
				continue;
			}
		}

		if (tag === "pb") {
			(started && currentContent ? currentContent : preface).push(element);
			continue;
		}

		(started && currentContent ? currentContent : preface).push(element);
	}

	if (chapters.length === 0) {
		const fallbackTitle =
			extractTextByRend(body, "title", defaultBook) ??
			defaultBook ??
			"Chapter 1";
		const title = fallbackTitle.trim() || "Chapter 1";
		chapters.push({
			book: currentBook,
			title,
			order: 1,
			prefaceNodes: [],
			contentNodes: preface.length > 0 ? [...preface] : getChildElements(body),
		});
	}

	return chapters;
}

// `<body>` の構造に合わせて最適な章抽出方法を選び、books.json 由来の分類セグメント付き章配列を返す。
// book 構造 → 章 `<div>` → 線形本文の順に試し、分類情報と `frontMatter` を引き継ぐ。
export function extractChapters(body: Element, filePath: string): Chapter[] {
	// 目的: `<body>` 先頭から最初の章までを前書きとして抽出する。
	// 処理: 章抽出の入口で一度だけ `extractBodyFrontMatter` を呼び、下位ロジックへ渡す。
	const frontMatter = extractBodyFrontMatter(body);

	// 分割有無の判断は呼び出し側（CLI）が ChapterListTypes の有無で制御する。
	const bookChapters = extractChaptersFromBodyBooks(body, frontMatter);
	if (bookChapters) {
		return bookChapters;
	}

	const directChapters = extractChaptersFromBodyDivs(body, frontMatter);
	if (directChapters) {
		return directChapters;
	}

	// どの方法でも章が取れないときの保険として、ファイル名などから書名を決めて線形解析に渡す。
	const fallbackBook = path.basename(filePath, path.extname(filePath));
	const defaultBook =
		extractTextByRend(body, "book", fallbackBook) ?? fallbackBook;

	return extractChaptersFromLinearBody(body, defaultBook);
}
