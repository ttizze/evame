// 目的: TEI/TEI-like XML を扱う共通ユーティリティを提供する。
// 処理: DOM の走査・整形・属性周りの共通処理をまとめて再利用しやすくする。

export const ELEMENT_NODE = 1;
export const TEXT_NODE = 3;

// 目的: 名前空間付きタグ名からローカル名を取得し判定を単純化する。
// 処理: ブレースやコロン区切りを取り除き、小文字に正規化して返す。
export function normalizeTagName(tagName: string): string {
	const noBrace = tagName.includes("}")
		? (tagName.split("}").pop() ?? tagName)
		: tagName;
	const noColon = noBrace.includes(":")
		? (noBrace.split(":").pop() ?? noBrace)
		: noBrace;
	return noColon.toLowerCase();
}

// 目的: 属性値を HTML/Markdown に安全に埋め込めるようエスケープする。
// 処理: 特殊文字をエンティティに置換し、安全な文字列を返す。
export function escapeHtmlAttributeValue(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

// 目的: 属性配列を HTML 互換の文字列へまとめる。
// 処理: 名前と値をエスケープして連結し、既定の前後スペースを付与する。
export function stringifyAttributes(attrs: Attr[]): string {
	return attrs
		.map(({ name, value }) => ` ${name}="${escapeHtmlAttributeValue(value)}"`)
		.join("");
}

// 目的: インライン要素とテキストを Markdown/HTML 文字列として直列化する。
// 処理: 子ノードを順にたどり、テキストはそのまま、要素は `renderInlineElementToString` を通じて再帰的に処理する。
export function renderInlineChildren(element: Element): string {
	let content = "";
	for (let child = element.firstChild; child; child = child.nextSibling) {
		content += renderInlineNodeToString(child);
	}
	return content;
}

// 目的: 未対応タグでも安全にインライン文字列へ直列化する。
// 処理: `hi` など特別なケースを優先処理し、残りは属性を組み立ててタグを再構築する。
export function renderInlineElementToString(element: Element): string {
	const tag = normalizeTagName(element.tagName);
	if (tag === "hi") {
		const rend = (element.getAttribute("rend") ?? "").toLowerCase();
		if (rend === "dot") {
			return ".";
		}
		const parts = rend.split(/\s+/);
		const content = renderInlineChildren(element);
		const leading = content.match(/^\s*/)?.[0] ?? "";
		const trailing = content.match(/\s*$/)?.[0] ?? "";
		const inner = content.trim();
		if (parts.includes("bold")) {
			return inner ? `${leading}**${inner}**${trailing}` : content;
		}
		if (parts.includes("italics") || parts.includes("italic")) {
			return inner ? `${leading}_${inner}_${trailing}` : content;
		}
		if (parts.includes("paranum")) {
			// Make paranum unambiguous for downstream parsing (e.g., §123.)
			return `${leading}§${inner}${trailing}`;
		}
	}
	const attrsString = stringifyAttributes(Array.from(element.attributes ?? []));
	if (!element.firstChild) {
		return `<${tag}${attrsString} />`;
	}
	const content = renderInlineChildren(element);
	return `<${tag}${attrsString}>${content}</${tag}>`;
}

// 目的: ノード配下からテキストのみを抽出し、空白を圧縮して返す。
// 処理: 再帰的に子ノードを走査し、テキストを連結してトリムする。
export function extractTextContent(node: Node): string {
	if (node.nodeType === TEXT_NODE) {
		return node.nodeValue ?? "";
	}
	if (node.nodeType === ELEMENT_NODE) {
		let text = "";
		for (let child = node.firstChild; child; child = child.nextSibling) {
			text += extractTextContent(child);
		}
		return text;
	}
	return "";
}

function renderInlineNodeToString(node: Node): string {
	if (node.nodeType === TEXT_NODE) {
		return node.nodeValue ?? "";
	}
	if (node.nodeType === ELEMENT_NODE) {
		return renderInlineElementToString(node as Element);
	}
	return "";
}

// 目的: 指定要素の子ノードから要素ノードのみを列挙する。
// 処理: childNodes をフィルタし、nodeType が ELEMENT_NODE のものだけを返す。
export function getChildElements(element: Element): Element[] {
	return Array.from(element.childNodes).filter(
		(child): child is Element => child.nodeType === ELEMENT_NODE,
	);
}

// 目的: 指定した `rend` 属性値を持つ要素を優先タグ内から探し出す。
// 処理: 幅優先探索で子孫を辿り、タグと `rend` の組み合わせが一致した要素を返す。
export function findElementByRend(
	element: Element,
	rend: string,
	tags: string[] = ["p", "head"],
): Element | null {
	const targetRend = rend.toLowerCase();
	const tagSet = new Set(tags.map((tag) => tag.toLowerCase()));
	const stack: Element[] = [element];

	for (let index = 0; index < stack.length; index += 1) {
		const current = stack[index];
		const tag = normalizeTagName(current.tagName);
		const currentRend = (current.getAttribute("rend") ?? "").toLowerCase();
		if (tagSet.has(tag) && currentRend === targetRend) {
			return current;
		}
		stack.push(...getChildElements(current));
	}

	return null;
}

// 目的: 指定した `rend` 属性の要素テキストを取得し、無ければ既定値を返す。
// 処理: `findElementByRend` で対象要素を探し、`extractTextContent` を圧縮して返す。
export function extractTextByRend(
	element: Element,
	rend: string,
	defaultValue?: string,
): string | undefined {
	const node = findElementByRend(element, rend);
	if (!node) {
		return defaultValue;
	}
	const text = extractTextContent(node).replace(/\s+/g, " ").trim();
	return text || defaultValue;
}

// 目的: 章コンテナから見出し要素とテキストをまとめて取得する。
// 処理: `findElementByRend` で章見出しを探し、存在すれば `extractTextContent` でタイトルを抽出する。
export function extractChapterHeadingInfo(container: Element): {
	node: Element | null;
	text: string | null;
} {
	const node = findElementByRend(container, "chapter");
	if (!node) {
		return { node: null, text: null };
	}
	const text = extractTextContent(node).replace(/\s+/g, " ").trim();
	return { node, text: text.length > 0 ? text : null };
}
