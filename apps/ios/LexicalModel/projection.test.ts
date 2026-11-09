import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { expect, it } from "vitest";
import { projectionCases } from "../../../tests/editor-matrix.mjs";

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
