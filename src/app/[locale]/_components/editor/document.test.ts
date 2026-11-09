import { buildEditorFromExtensions } from "@lexical/extension";
import { HeadlessExtension } from "@lexical/headless";
import {
	$convertFromMarkdownString,
	$convertToMarkdownString,
} from "@lexical/mdast";
import {
	$createParagraphNode,
	$getRoot,
	$getSelection,
	$isRangeSelection,
	defineExtension,
	KEY_ENTER_COMMAND,
} from "lexical";
import { describe, expect, it } from "vitest";
import {
	blockInputs,
	blockSamples,
} from "../../../../../tests/editor-matrix.mjs";
import { $setBlockType } from "./block-type";
import { DocumentExtension } from "./document";

function model(headless: boolean) {
	return buildEditorFromExtensions(
		defineExtension({
			name: "document-test",
			theme: { tableScrollableWrapper: "table-scroll" },
			dependencies: headless
				? [DocumentExtension, HeadlessExtension]
				: [DocumentExtension],
		}),
	);
}

// キー・編集環境・記法の区切り文字を除き、内容と構造を比較する。
function content(node: unknown): unknown {
	if (Array.isArray(node)) return node.map(content);
	if (node === null || typeof node !== "object") return node;
	return Object.fromEntries(
		Object.entries(node)
			.filter(([key]) =>
				[
					"root",
					"children",
					"type",
					"text",
					"tag",
					"listType",
					"start",
					"checked",
					"shadowRoot",
					"format",
				].includes(key),
			)
			.map(([key, value]) => [key, content(value)]),
	);
}

describe("PCとiPhoneが共有する本文構造", () => {
	for (const sample of [
		...blockSamples
			.slice(0, 9)
			.map((sample) => ({ ...sample, text: "甲乙丙" })),
		{
			name: "改行とタブを含むコード",
			type: "code",
			template: "```\n{text}\n```",
			text: "foo\n\tbar",
		},
	])
		it(`${sample.name}を読み込み・メニュー・Markdown入力で作っても同じ構造になる`, () => {
			const states = [];
			for (const headless of [false, true])
				for (const origin of ["load", "menu", "shortcut"]) {
					const editor = model(headless);
					editor.update(
						() => {
							if (origin === "load")
								$convertFromMarkdownString(
									sample.template.replace("{text}", sample.text),
								);
							else {
								const paragraph = $createParagraphNode();
								$getRoot().clear().append(paragraph);
								paragraph.select();
							}
						},
						{ discrete: true },
					);
					if (origin === "menu")
						editor.update(
							() =>
								$setBlockType(
									sample.type as Parameters<typeof $setBlockType>[0],
								),
							{ discrete: true },
						);
					if (origin === "shortcut") {
						for (const char of blockInputs[
							sample.type as keyof typeof blockInputs
						])
							editor.update(
								() => {
									const selection = $getSelection();
									if ($isRangeSelection(selection))
										char === "\n"
											? editor.dispatchCommand(KEY_ENTER_COMMAND, null)
											: selection.insertText(char);
								},
								{ discrete: true },
							);
					}
					if (origin !== "load")
						for (const char of sample.text)
							editor.update(
								() => {
									const selection = $getSelection();
									if ($isRangeSelection(selection)) {
										if (char === "\n")
											editor.dispatchCommand(KEY_ENTER_COMMAND, null);
										else if (char === "\t") selection.insertRawText(char);
										else selection.insertText(char);
									}
								},
								{ discrete: true },
							);
					const state = content(editor.getEditorState().toJSON());
					states.push({ headless, origin, state });
					const saved = editor.read(() => $convertToMarkdownString());
					editor.update(() => $convertFromMarkdownString(saved), {
						discrete: true,
					});
					expect(
						content(editor.getEditorState().toJSON()),
						`${headless}/${origin}: 再読み込み`,
					).toEqual(state);
				}
			for (const result of states)
				expect(result.state, `${result.headless}/${result.origin}`).toEqual(
					states[0].state,
				);
		});
});
