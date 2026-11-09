import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { expect, it } from "vitest";
import {
	paragraphEditCases,
	projectionCases,
} from "../../../tests/editor-matrix.mjs";

const source = readFileSync("apps/ios/App/Resources/LexicalModel.js", "utf8");
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
