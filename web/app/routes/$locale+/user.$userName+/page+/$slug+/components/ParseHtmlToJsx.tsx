import createDOMPurify from "dompurify";
import { JSDOM } from "jsdom";
// app/utils/parseHtmlToJsx.server.tsx
import React from "react";

// 例: あなたの型定義
import type { SourceTextWithTranslations } from "../types";

// カスタムコンポーネントをimport
import { SourceTextAndTranslationSection } from "./sourceTextAndTranslationSection/SourceTextAndTranslationSection";
console.log("STTS:", SourceTextAndTranslationSection);
type TransformOptions = {
	locale: string;
	showOriginal: boolean;
	showTranslation: boolean;
	dataSourceMap: Record<
		number,
		{
			sourceTextWithTranslations: SourceTextWithTranslations;
			showLockIcon?: boolean;
			isOwner?: boolean;
			slug?: string;
			currentUserName?: string;
		}
	>;
};

/**
 * HTML文字列をパースし、React要素を組み立てて返す
 * → 文字列にはせず、最終的に Remix がSSR & Hydrationする形になる
 *    => script, styleタグなどReactで扱えないタグは除外
 */
export function parseHtmlToJsx(
	rawHtml: string,
	opts: TransformOptions,
): React.ReactNode {
	const { locale, showOriginal, showTranslation, dataSourceMap } = opts;

	// 1) DOMPurify（サーバーサイド）で初期サニタイズ
	const window = new JSDOM("").window;
	const DOMPurify = createDOMPurify(window);
	const sanitizedInitial = DOMPurify.sanitize(rawHtml);

	// 2) jsdomでパース
	const dom = new JSDOM(sanitizedInitial);
	const doc = dom.window.document;

	// doc.body内のノードを再帰的にReactノードへ変換
	const resultNodes: React.ReactNode[] = [];
	for (const child of Array.from(doc.body.childNodes)) {
		resultNodes.push(
			nodeToJsx(child, {
				locale,
				showOriginal,
				showTranslation,
				dataSourceMap,
			}),
		);
	}

	// 最終的に <React.Fragment> などでまとめて返す
	return <>{resultNodes}</>;
}

// 再帰的に jsdom の Node をReact要素に変換
function nodeToJsx(
	node: globalThis.Node,
	opts: TransformOptions,
): React.ReactNode {
	const { locale, showOriginal, showTranslation, dataSourceMap } = opts;

	// テキストノード (nodeType=3)
	if (node.nodeType === 3) {
		return node.textContent;
	}

	// elementノード (nodeType=1)
	if (node.nodeType === 1) {
		const el = node as Element;

		// data-source-text-id がある場合は <SourceTextAndTranslationSection> に差し替え
		const dataIdStr = el.getAttribute("data-source-text-id");
		if (dataIdStr) {
			const dataId = Number(dataIdStr);
			const info = dataSourceMap[dataId];
			if (!info) {
				// 対応するIDがなければ単にテキストノード化
				return el.textContent;
			}
			// JSXコンポーネントとして返す
			return (
				<SourceTextAndTranslationSection
					key={dataId}
					sourceTextWithTranslations={info.sourceTextWithTranslations}
					elements={info.sourceTextWithTranslations.sourceText.text}
					showOriginal={showOriginal}
					showTranslation={showTranslation}
					showLockIcon={info.showLockIcon}
					isOwner={info.isOwner}
					slug={info.slug}
					currentUserName={info.currentUserName}
				/>
			);
		}

		// script / styleタグは無視（Reactで扱えないため）
		const tagNameLower = el.tagName.toLowerCase();
		console.log("[nodeToJsx] tagName:", tagNameLower); // ←追加
		if (["script", "style"].includes(tagNameLower)) {
			return null;
		}

		// aタグの書き換え
		if (tagNameLower === "a") {
			const href = el.getAttribute("href") || "";
			let newHref = href;
			if (!/^https?:\/\//.test(href)) {
				newHref = `/${locale}${href.startsWith("/") ? "" : "/"}${href}`;
			}
			// 子ノードを再帰
			const children = Array.from(el.childNodes).map((child) =>
				nodeToJsx(child, opts),
			);
			return (
				<a href={newHref} className="underline underline-offset-4">
					{children}
				</a>
			);
		}

		// imgタグの書き換え
		if (tagNameLower === "img") {
			const src = el.getAttribute("src") || "";
			const alt = el.getAttribute("alt") || "";
			return (
				<img src={src} alt={alt} className="aspect-ratio-img max-w-full" />
			);
		}
		const allowedTags = [
			"p",
			"div",
			"span",
			"strong",
			"em",
			"a",
			"img",
			"ul",
			"li",
		];

		if (!allowedTags.includes(tagNameLower)) {
			return null;
		}

		// その他タグの場合 (p, div, span, h1, h2, etc...)
		// React.createElementでJSX生成
		const children = Array.from(el.childNodes).map((child) =>
			nodeToJsx(child, opts),
		);
		return React.createElement(tagNameLower, {}, children);
	}

	return null; // それ以外のノードは無視
}
