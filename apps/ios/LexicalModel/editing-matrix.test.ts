import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import { removePosition } from "unist-util-remove-position";
import { describe, expect, it } from "vitest";
import { editingCases } from "../../../tests/editor-matrix.mjs";

const source = readFileSync("apps/ios/App/Resources/LexicalModel.js", "utf8");
const processor = unified()
	.use(remarkParse)
	.use(remarkGfm)
	.use(remarkRehype, { allowDangerousHtml: true });
function rendered(markdown: string) {
	const tree = processor.runSync(processor.parse(markdown));
	removePosition(tree, { force: true });
	return tree;
}

describe("iPhoneへ同梱する編集モデルの総当たり", () => {
	for (const entry of editingCases)
		it(`${entry.name}・保存とUndo/Redo`, () => {
			const context: Record<string, unknown> = {};
			runInNewContext(source, context);
			const request = (input: Record<string, unknown>) => {
				const output = JSON.parse(
					(context.evameEditorRequest as (json: string) => string)(
						JSON.stringify(input),
					),
				);
				expect(
					output.failure,
					`${entry.name}: ${JSON.stringify(input)}`,
				).toBeUndefined();
				return output;
			};
			request({ action: "load", markdown: entry.source });
			if (entry.create) {
				request({
					action: "select",
					anchor: { unit: 0, offset: 0 },
					focus: { unit: 0, offset: 0 },
				});
				request({ action: "block", type: entry.create });
			}
			if (entry.input !== null) {
				request({
					action: "select",
					anchor: { unit: 0, offset: 0 },
					focus: { unit: 0, offset: 0 },
				});
				for (const char of entry.input + (entry.empty ? "" : "甲乙丙"))
					request(
						char === "\n"
							? { action: "command", name: "enter" }
							: { action: "insert", text: char },
					);
			}
			const before = request({
				action: "select",
				anchor: { unit: entry.unit, offset: entry.offset },
				focus: { unit: entry.unit, offset: entry.offset },
			});
			const input =
				entry.action === "block"
					? { action: "block", type: entry.argument }
					: { action: "command", name: entry.action };
			if (entry.action === "backspace" && entry.offset > 0) {
				request({
					action: "select",
					anchor: { unit: entry.unit, offset: entry.offset - 1 },
					focus: { unit: entry.unit, offset: entry.offset },
				});
			}
			const after = request(input);
			if (
				after.markdown !== before.markdown ||
				JSON.stringify(after.units) !== JSON.stringify(before.units)
			) {
				const undone = request({ action: "command", name: "undo" });
				expect(rendered(undone.markdown)).toEqual(rendered(before.markdown));
				const redone = request({ action: "command", name: "redo" });
				expect(rendered(redone.markdown)).toEqual(rendered(after.markdown));
				expect(redone.selection).toEqual(after.selection);
			}
			const result =
				entry.action === "enter" || entry.empty
					? request({ action: "insert", text: "追" })
					: after;
			expect(rendered(result.markdown)).toEqual(rendered(entry.expected));
			const restored = request({ action: "load", markdown: result.markdown });
			expect(rendered(restored.markdown)).toEqual(rendered(entry.expected));
		});
});
