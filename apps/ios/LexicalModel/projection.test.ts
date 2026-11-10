import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { expect, it } from "vitest";
import {
	paragraphEditCases,
	projectionCases,
} from "../../../tests/editor-matrix.mjs";

const source = readFileSync("apps/ios/App/Resources/LexicalModel.js", "utf8");
it.each([
	{ action: "paste", clipboard: { "text/plain": "x" } },
	{ action: "pasteAttributed", runs: [{ text: "x", formats: [], link: null }] },
] as const)(
	"1文字の貼り付けも直前の入力と分けてUndo/Redoできる（$action）",
	(paste) => {
		const context: Record<string, unknown> = {};
		runInNewContext(source, context);
		const request = (input: Record<string, unknown>) => {
			const result = JSON.parse(
				(context.evameEditorRequest as (json: string) => string)(
					JSON.stringify(input),
				),
			);
			expect(result.failure).toBeUndefined();
			return result;
		};
		request({ action: "load", markdown: "z" });
		request({
			action: "select",
			anchor: { unit: 0, offset: 1 },
			focus: { unit: 0, offset: 1 },
		});
		expect(request({ action: "insert", text: "t" }).markdown).toBe("zt");
		expect(request(paste).markdown).toBe("ztx");
		expect(request({ action: "command", name: "undo" }).markdown).toBe("zt");
		expect(request({ action: "command", name: "undo" }).markdown).toBe("z");
		expect(request({ action: "command", name: "redo" }).markdown).toBe("zt");
		expect(request({ action: "command", name: "redo" }).markdown).toBe("ztx");
	},
);
it.each([
	[
		"親チェック項目",
		"- [ ] &#x20;\n\n  - [ ] 子\n\n  親本文",
		{ action: "toggleChecked", unit: 0, item: 0 },
		"- [x]",
	],
	[
		"表セル",
		"| a |\n| - |\n| b |",
		{ action: "setTableCell", unit: 0, row: 1, column: 0, markdown: "変更" },
		"変更",
	],
] as const)(
	"カーソルがない文書の%sを変更してもUndo/Redoで内容を保つ",
	(_name, markdown, action, expected) => {
		const context: Record<string, unknown> = {};
		runInNewContext(source, context);
		const request = (input: Record<string, unknown>) => {
			const result = JSON.parse(
				(context.evameEditorRequest as (json: string) => string)(
					JSON.stringify(input),
				),
			);
			expect(result.failure).toBeUndefined();
			return result;
		};
		const before = request({ action: "load", markdown });
		const after = request(action);
		expect(after.markdown).toContain(expected);
		expect(request({ action: "command", name: "undo" }).markdown).toBe(
			before.markdown,
		);
		expect(request({ action: "command", name: "redo" }).markdown).toBe(
			after.markdown,
		);
	},
);
it("子から始まる親チェック項目にも親自身の読み上げ名を渡す", () => {
	const context: Record<string, unknown> = {};
	runInNewContext(source, context);
	const result = JSON.parse(
		(context.evameEditorRequest as (json: string) => string)(
			JSON.stringify({
				action: "load",
				markdown: "- [ ] &#x20;\n\n  - [ ] 子\n\n  親本文",
			}),
		),
	);
	expect(result.failure).toBeUndefined();
	expect(
		result.units.flatMap((unit: { listItems: { label: string }[] }) =>
			unit.listItems.map((item) => item.label),
		),
	).toEqual(["親本文", "子"]);
});
it("他アプリの装飾付き文章で全文を置き換えても古い入れ子を残さずUndo/Redoできる", () => {
	const context: Record<string, unknown> = {};
	runInNewContext(source, context);
	const request = (input: Record<string, unknown>) => {
		const result = JSON.parse(
			(context.evameEditorRequest as (json: string) => string)(
				JSON.stringify(input),
			),
		);
		expect(result.failure).toBeUndefined();
		return result;
	};
	const initial = request({ action: "load", markdown: "- - 子\n\n  元の本文" });
	request({
		action: "select",
		anchor: { unit: 0, offset: 0 },
		focus: { unit: 1, offset: 4 },
	});
	const pasted = request({
		action: "pasteAttributed",
		runs: [
			{
				text: "日本語abc\n\n- 本文",
				formats: ["bold", "italic"],
				link: "https://example.com",
			},
		],
	});
	expect(
		pasted.units.every(
			(unit: { listItems: unknown[] }) => unit.listItems.length === 0,
		),
	).toBe(true);
	expect(
		pasted.units
			.flatMap((unit: { runs: { text?: string }[] }) =>
				unit.runs.map((run) => run.text ?? ""),
			)
			.join(""),
	).toBe("日本語abc\n\n- 本文");
	expect(request({ action: "command", name: "undo" }).markdown).toBe(
		initial.markdown,
	);
	expect(request({ action: "command", name: "redo" }).markdown).toBe(
		pasted.markdown,
	);
	expect(request({ action: "load", markdown: pasted.markdown }).markdown).toBe(
		pasted.markdown,
	);
});
for (const [markdown, kind] of [
	["---", "horizontalrule"],
	["| a |\n| - |\n| b |", "table"],
])
	for (const offset of [0, 1])
		it(`${kind}だけの文書の${offset === 0 ? "前" : "後"}で書式を変えても位置を保ち入力・Undo/Redo・再読み込みできる`, () => {
			const context: Record<string, unknown> = {};
			runInNewContext(source, context);
			const request = (input: Record<string, unknown>) => {
				const result = JSON.parse(
					(context.evameEditorRequest as (json: string) => string)(
						JSON.stringify(input),
					),
				);
				expect(result.failure).toBeUndefined();
				return result;
			};
			const initial = request({ action: "load", markdown });
			const point = { unit: 0, offset };
			expect(
				request({ action: "select", anchor: point, focus: point }).selection,
			).toEqual({ anchor: point, focus: point });
			expect(request({ action: "format", format: "bold" }).selection).toEqual({
				anchor: point,
				focus: point,
			});
			const after = request({ action: "insert", text: "追" });
			const order = after.units.map(
				(unit: { atomic?: { type: string }; runs?: { text: string }[] }) =>
					unit.atomic?.type ?? unit.runs?.map((run) => run.text).join(""),
			);
			expect(order).toEqual(offset === 0 ? ["追", kind] : [kind, "追"]);
			expect(after.markdown).toContain("**追**");
			expect(request({ action: "command", name: "undo" }).markdown).toBe(
				initial.markdown,
			);
			expect(request({ action: "command", name: "redo" }).markdown).toBe(
				after.markdown,
			);
			expect(
				request({ action: "load", markdown: after.markdown }).markdown,
			).toBe(after.markdown);
		});
for (const { name, markdown, text } of projectionCases)
	it(`${name}の本文をUIKitへすべて渡し、各段落を編集してUndoで戻せる`, () => {
		const context: Record<string, unknown> = {};
		runInNewContext(source, context);
		const request = (input: Record<string, unknown>) => {
			const result = JSON.parse(
				(context.evameEditorRequest as (json: string) => string)(
					JSON.stringify(input),
				),
			);
			expect(result.failure).toBeUndefined();
			return result;
		};
		const initial = request({ action: "load", markdown });
		expect(
			initial.units.map((unit: { runs?: { text: string }[] }) =>
				unit.runs?.map((run) => run.text).join(""),
			),
		).toEqual(text);
		for (const [unit, value] of text.entries()) {
			request({
				action: "select",
				anchor: { unit, offset: value.length },
				focus: { unit, offset: value.length },
			});
			const edited = request({ action: "insert", text: "追" });
			expect(
				edited.units[unit].runs
					.map((run: { text: string }) => run.text)
					.join(""),
			).toBe(`${value}追`);
			const undone = request({ action: "command", name: "undo" });
			expect(undone.markdown).toBe(initial.markdown);
		}
	});

for (const entry of paragraphEditCases)
	it(`複数段落の項目の${entry.name}で空行・位置・続きの入力を保つ`, () => {
		const context: Record<string, unknown> = {};
		runInNewContext(source, context);
		const request = (input: Record<string, unknown>) => {
			const result = JSON.parse(
				(context.evameEditorRequest as (json: string) => string)(
					JSON.stringify(input),
				),
			);
			expect(result.failure).toBeUndefined();
			return result;
		};
		const initial = request({
			action: "load",
			markdown: "- 前半\n\n  中間\n\n  後半\n\n後の段落",
		});
		const offset = entry.action === "enter" ? 2 : 0;
		request({
			action: "select",
			anchor: { unit: entry.unit, offset },
			focus: {
				unit: entry.unit,
				offset: entry.action === "delete" ? 2 : offset,
			},
		});
		const after = request(
			entry.action === "delete"
				? { action: "insert", text: "" }
				: { action: "command", name: entry.action },
		);
		expect(
			after.units.map((unit: { runs: { text: string }[] }) =>
				unit.runs.map((run) => run.text).join(""),
			),
		).toEqual(entry.text);
		if (entry.action === "backspace" && entry.unit === 0)
			expect(after.markdown.trim()).toBe("前半\n\n中間\n\n後半\n\n後の段落");
		expect(after.selection).toEqual({
			anchor: entry.caret,
			focus: entry.caret,
		});
		expect(request({ action: "command", name: "undo" }).markdown).toBe(
			initial.markdown,
		);
		request({ action: "command", name: "redo" });
		const edited = request({ action: "insert", text: "追" });
		expect(
			edited.units[entry.caret.unit].runs
				.map((run: { text: string }) => run.text)
				.join(""),
		).toBe(
			entry.text[entry.caret.unit].slice(0, entry.caret.offset) +
				"追" +
				entry.text[entry.caret.unit].slice(entry.caret.offset),
		);
		const restored = request({ action: "load", markdown: edited.markdown });
		expect(restored.markdown).toBe(edited.markdown);
	});

it("読み込んだ複数行の太字を一度の操作で解除し、保存と再読み込みでも解除を保つ", () => {
	const context: Record<string, unknown> = {};
	runInNewContext(source, context);
	const request = (input: Record<string, unknown>) =>
		JSON.parse(
			(context.evameEditorRequest as (json: string) => string)(
				JSON.stringify(input),
			),
		);
	request({ action: "load", markdown: "**a\nb**" });
	request({
		action: "select",
		anchor: { unit: 0, offset: 0 },
		focus: { unit: 0, offset: 3 },
	});
	const result = request({ action: "format", format: "bold" });
	expect(
		result.units[0].runs.every(
			(run: { formats: string[] }) => !run.formats.includes("bold"),
		),
	).toBe(true);
	expect(result.markdown).toBe("a\nb");
	expect(request({ action: "load", markdown: result.markdown }).markdown).toBe(
		"a\nb",
	);
});
