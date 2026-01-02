import type { Html, Paragraph, Root, Text } from "mdast";
import { toString as mdastToString } from "mdast-util-to-string";
import type { Plugin } from "unified";
import { visit } from "unist-util-visit";
import { BLOCK_TYPE_TO_CLASS, isValidBlockType } from "./custom-block-types";

/**
 * カスタムブロック記法とインライン特殊記法を解釈するremarkプラグイン
 *
 * ブロック記法:
 * - ::gatha1\n...\n:: → <p class="gatha1">
 * - ::gatha2\n...\n:: → <p class="gatha2">
 * - ::gatha3\n...\n:: → <p class="gatha3">
 * - ::gathalast\n...\n:: → <p class="gathalast">
 * - ::indent\n...\n:: → <p class="indent">
 * - ::unindented\n...\n:: → <p class="unindented">
 * - ::centre\n...\n:: → <p class="centre">
 * - ::hangnum\n...\n:: → <p class="hangnum">
 *
 * インライン記法:
 * - {note:内容} → <span class="note">内容</span>
 * - {pb:ed:n} → <span class="pb" data-ed="ed" data-n="n"></span>
 * - {pb:ed} → <span class="pb" data-ed="ed"></span>
 * - {pb:n} → <span class="pb" data-n="n"></span>
 * - {pb} → <span class="pb"></span>
 */
export const remarkCustomBlocks: Plugin<[], Root> = () => (tree: Root) => {
	// ブロック記法の処理
	visit(tree, "paragraph", (paragraph: Paragraph, index, parent) => {
		if (!parent || typeof index !== "number") return;

		// 段落全体を一括判定するためにテキストを抽出する
		const rawText = mdastToString(paragraph, { includeImageAlt: false });
		const blockMatch = /^::(\w+)\n([\s\S]*?)\n::$/m.exec(rawText);
		if (!blockMatch) return;

		const [, blockType] = blockMatch;
		// 記法に合致した段落だけ変換するために子ノードを整形する
		const transformed = transformCustomBlockFromChildren(blockType, paragraph);
		if (!transformed) return;

		(parent.children as Paragraph[]).splice(index, 1, transformed);
	});

	// インライン特殊記法の処理 ({note:...} と {pb:...})
	visit(tree, "text", (textNode: Text, index, parent) => {
		if (!parent || typeof index !== "number") return;

		const value = textNode.value;
		// 1つのテキストノード内の記法をまとめて分解するために配列化する
		const newParts = processInlineNotations(value);

		// マッチが見つかった場合のみ置き換え
		if (newParts.length > 0) {
			(parent.children as Array<Text | Html>).splice(index, 1, ...newParts);
		}
	});
};

/**
 * テキスト内のインライン特殊記法を処理して、Text/Htmlノードの配列に変換
 * ブロック記法と同じパターンで、正規表現で一括処理
 */
function processInlineNotations(value: string): Array<Text | Html> {
	const parts: Array<Text | Html> = [];
	let lastIndex = 0;

	// 仕様の優先順を守って変換するためにマッチ順を固定する
	// すべての特殊記法を一度に検出（優先順位: より具体的なパターンから）
	// {pb:ed:n} → {note:...} → {pb:...} → {pb} の順で処理
	const pattern =
		/\{pb:([^}:]+):([^}]+)\}|\{note:([^}]+)\}|\{pb:([^}]+)\}|\{pb\}/g;

	let match: RegExpExecArray | null = pattern.exec(value);
	while (match !== null) {
		const matchStart = match.index;
		const matchEnd = matchStart + match[0].length;

		// マッチ前のテキストを追加
		if (matchStart > lastIndex) {
			const beforeText = value.slice(lastIndex, matchStart);
			if (beforeText) {
				parts.push({ type: "text", value: beforeText });
			}
		}

		// HTMLに落とし込むために記法ごとの属性や内容を組み立てる
		// マッチタイプを判定してHTMLノードを追加
		if (match[1] && match[2]) {
			// {pb:ed:n}
			parts.push({
				type: "html",
				value: `<span class="pb" data-ed="${escapeHtmlAttribute(match[1])}" data-n="${escapeHtmlAttribute(match[2])}"></span>`,
			});
		} else if (match[3]) {
			// {note:内容}
			parts.push({
				type: "html",
				value: `<span class="note">${escapeHtml(match[3])}</span>`,
			});
		} else if (match[4]) {
			// {pb:ed} または {pb:n}
			parts.push({
				type: "html",
				value: `<span class="pb" data-value="${escapeHtmlAttribute(match[4])}"></span>`,
			});
		} else {
			// {pb}
			parts.push({
				type: "html",
				value: '<span class="pb"></span>',
			});
		}

		lastIndex = matchEnd;
		match = pattern.exec(value);
	}

	// マッチがない場合は空配列を返す（元のテキストノードを保持）
	if (parts.length === 0 && lastIndex === 0) {
		return [];
	}

	// 末尾のテキストを落とさないために残りを追加する
	// 残りのテキストを追加
	if (lastIndex < value.length) {
		const remaining = value.slice(lastIndex);
		if (remaining) {
			parts.push({ type: "text", value: remaining });
		}
	}

	return parts;
}

/**
 * HTMLコンテンツをエスケープ
 */
function escapeHtml(text: string): string {
	// HTML本文として安全に扱うために文字参照へ変換する
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

/**
 * HTML属性値をエスケープ
 */
function escapeHtmlAttribute(value: string): string {
	// HTML属性として安全に扱うために文字参照へ変換する
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

function transformCustomBlockFromChildren(
	blockType: string,
	paragraph: Paragraph,
): Paragraph | null {
	if (!isValidBlockType(blockType)) {
		return null;
	}

	const children = [...paragraph.children];
	const prefixPattern = new RegExp(`^::${blockType}\\n`);
	const suffixPattern = /\n::$/;
	// ブロック記法の前後だけ削るために最初と最後のテキストを探す
	const firstTextIndex = children.findIndex((child) => child.type === "text");
	if (firstTextIndex === -1) return null;
	const lastTextIndex =
		children.length -
		1 -
		[...children].reverse().findIndex((child) => child.type === "text");
	if (lastTextIndex < 0) return null;

	// 余計な記法を取り除いて中身だけ残すために前後を置換する
	(children[firstTextIndex] as Text).value = (
		children[firstTextIndex] as Text
	).value.replace(prefixPattern, "");
	(children[lastTextIndex] as Text).value = (
		children[lastTextIndex] as Text
	).value.replace(suffixPattern, "");

	// 空のテキストノードを残さないためにフィルタする
	const cleanedChildren = children.filter(
		(child) => !(child.type === "text" && child.value.length === 0),
	);

	return {
		type: "paragraph",
		children: cleanedChildren,
		data: {
			hProperties: {
				class: BLOCK_TYPE_TO_CLASS[blockType],
			},
		},
	};
}
