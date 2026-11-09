import { describe, expect, it } from "vitest";
import { markdownToMdastWithSegments } from "./markdown-to-mdast-with-segments";

describe("Markdownから保存用の文書を作る", () => {
	it("GFMの表・取り消し線・チェックリストを構造として取り込む", async () => {
		const { mdastJson, segments } = await markdownToMdastWithSegments({
			header: "見出し",
			markdown:
				"~~取り消し~~\n\n- [x] 完了\n\n| 名前 | 値 |\n| --- | --- |\n| 本文 | 内容 |",
			autoUploadImages: false,
		});
		expect(mdastJson).toMatchObject({
			type: "root",
			children: [
				{ type: "paragraph", children: [{ type: "delete" }] },
				{ type: "list", children: [{ type: "listItem", checked: true }] },
				{ type: "table" },
			],
		});
		expect(segments.map((segment) => segment.text)).toEqual([
			"見出し",
			"取り消し",
			"完了",
			"名前",
			"値",
			"本文",
			"内容",
		]);
	});

	it("段落を追加しても変更していない段落の照合用ハッシュを保つ", async () => {
		const input = { header: "見出し", autoUploadImages: false };
		const before = await markdownToMdastWithSegments({
			...input,
			markdown: "残す段落\n\n変更前",
		});
		const after = await markdownToMdastWithSegments({
			...input,
			markdown: "追加した段落\n\n残す段落\n\n変更後",
		});
		expect(
			after.segments.find((segment) => segment.text === "残す段落")
				?.textAndOccurrenceHash,
		).toBe(
			before.segments.find((segment) => segment.text === "残す段落")
				?.textAndOccurrenceHash,
		);
	});
});
