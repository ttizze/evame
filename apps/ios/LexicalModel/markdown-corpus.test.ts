import { readFileSync } from "node:fs";
import { Script } from "node:vm";
import type { Root, RootContent } from "hast";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import { removePosition } from "unist-util-remove-position";
import { describe, expect, it } from "vitest";

const model = new Script(
	readFileSync("apps/ios/App/Resources/LexicalModel.js", "utf8"),
);
const processor = unified()
	.use(remarkParse)
	.use(remarkGfm)
	.use(remarkRehype, { allowDangerousHtml: true });
function rendered(markdown: string) {
	const tree = processor.runSync(processor.parse(markdown)) as Root;
	removePosition(tree, { force: true });
	// 太字・斜体・取消線はLexicalと画面が持つ装飾の集合として比較する。
	// 同じ装飾の重複やstrong/emの順番の正規化を、本文の欠落と混同しない。
	const flatten = (
		node: Root | RootContent,
		formats: string[],
		preserveWhitespace = false,
	): unknown[] => {
		if (
			node.type === "element" &&
			["strong", "em", "del"].includes(node.tagName)
		)
			return node.children.flatMap((child) =>
				flatten(
					child,
					[...new Set([...formats, node.tagName])].sort(),
					preserveWhitespace,
				),
			);
		if ("children" in node) {
			const children = node.children.flatMap((child) =>
				flatten(
					child,
					formats,
					preserveWhitespace ||
						(node.type === "element" && ["pre", "code"].includes(node.tagName)),
				),
			) as { type: string; value?: string; formats?: string[] }[];
			const merged: typeof children = [];
			for (const child of children) {
				const previous = merged.at(-1);
				if (
					previous?.type === "text" &&
					child.type === "text" &&
					JSON.stringify(previous.formats) === JSON.stringify(child.formats)
				)
					previous.value += child.value ?? "";
				else merged.push(child);
			}
			return [{ ...node, children: merged }];
		}
		if (node.type === "text" && !preserveWhitespace)
			return node.value
				.split(/([ \t\r\n\f]+)/)
				.filter(Boolean)
				.map((value) =>
					/^[ \t\r\n\f]+$/.test(value)
						? { type: "text", value: " " }
						: {
								type: "text",
								value,
								...(formats.length > 0 ? { formats } : {}),
							},
				);
		return [{ ...node, ...(formats.length > 0 ? { formats } : {}) }];
	};
	return flatten(tree, []);
}

describe("公式例の比較が内容の欠落を見逃さない", () => {
	it.each([
		["本文", "前後", "前"],
		["太字", "**文字**", "文字"],
		["斜体", "*文字*", "文字"],
		["リンク先", "[文字](https://a.example)", "[文字](https://b.example)"],
		["空リンク", "[](https://a.example)", ""],
		["段落の境界", "前\n\n後", "前\n後"],
		["コードの改行", "```\n前\n後\n```", "```\n前後\n```"],
		["コードのタブ", "```\n\t文字\n```", "```\n 文字\n```"],
		["リストの番号", "3. 文字", "1. 文字"],
		["チェック状態", "- [x] 文字", "- [ ] 文字"],
		["HTML", "<div>前</div>", "<div>後</div>"],
	])("%sの変化を検出する", (_, before, after) => {
		expect(rendered(before)).not.toEqual(rendered(after));
	});
	it("装飾の順序と重複・HTMLの通常空白の正規化は許容する", () => {
		expect(rendered("***文字***")).toEqual(rendered("**_文字_**"));
		expect(rendered("前\n後")).toEqual(rendered("前 後"));
	});
});

// 固定済みの公式例を実際に同梱するLexicalモデルへ通す。アプリのCommonMark+GFM設定での内容を比較する。
for (const [name, count] of [
	["commonmark-0.31.2", 652],
	["gfm-0.29", 677],
] as const)
	describe(`公式${name}の全例をiPhoneモデルで往復する`, () => {
		const cases: { example: number; section?: string; markdown: string }[] =
			JSON.parse(
				readFileSync(
					`apps/ios/Tests/EditorCoreTests/Fixtures/Upstream/${name}.json`,
					"utf8",
				),
			);
		it("固定した公式例の件数を保つ", () => expect(cases).toHaveLength(count));
		for (const entry of cases)
			it(`${entry.section ?? "GFM"}・例${entry.example}の内容を保存と再読み込みで保つ`, () => {
				const context: Record<string, unknown> = {};
				model.runInNewContext(context);
				const request = (markdown: string) => {
					const result = JSON.parse(
						(context.evameEditorRequest as (json: string) => string)(
							JSON.stringify({ action: "load", markdown }),
						),
					);
					expect(result.failure).toBeUndefined();
					return result.markdown as string;
				};
				const saved = request(entry.markdown);
				expect(rendered(saved)).toEqual(rendered(entry.markdown));
				expect(rendered(request(saved))).toEqual(rendered(entry.markdown));
			});
	});
