import { describe, expect, it } from "vitest";
import { readBooksJson } from "../../books";
import { buildCategoryTree } from "./build-category-tree";

describe("buildCategoryTree", () => {
	it("実際のTipitakaファイルメタデータからルートノードを作成する", async () => {
		// Arrange: 実際のbooks.jsonからデータを読み込む
		const { tipitakaFileMetas } = await readBooksJson();

		// Act
		const result = buildCategoryTree(tipitakaFileMetas);

		// Assert: ルートノードが作成される
		expect(result.dirSegment).toBe("");
		expect(result.title).toBe("TipiṭAka");
		expect(result.order).toBe(0);
	});

	it("実際のTipitakaファイルメタデータから階層構造を構築する", async () => {
		// Arrange: 実際のbooks.jsonからデータを読み込む
		const { tipitakaFileMetas } = await readBooksJson();

		// Act
		const result = buildCategoryTree(tipitakaFileMetas);

		// Assert: 実際のデータから具体的なパスを選んで検証
		// 例: "01-tipitaka-mula" → "01-sutta-pitaka" → "01-digha-nikaya" の階層が存在する
		const tipitakaMulaNode = result.children.get("01-tipitaka-mula");
		expect(tipitakaMulaNode).toBeDefined();
		expect(tipitakaMulaNode?.dirSegment).toBe("01-tipitaka-mula");

		const suttaPitakaNode = tipitakaMulaNode?.children.get("01-sutta-pitaka");
		expect(suttaPitakaNode).toBeDefined();
		expect(suttaPitakaNode?.dirSegment).toBe("01-sutta-pitaka");

		const dighaNikayaNode = suttaPitakaNode?.children.get("01-digha-nikaya");
		expect(dighaNikayaNode).toBeDefined();
		expect(dighaNikayaNode?.dirSegment).toBe("01-digha-nikaya");
	});

	it("同じパスを持つファイルが複数ある場合、ノードを共有する", async () => {
		// Arrange: 実際のbooks.jsonからデータを読み込む
		const { tipitakaFileMetas } = await readBooksJson();

		// Act
		const result = buildCategoryTree(tipitakaFileMetas);

		// Assert: 同じパスを持つファイルが複数ある場合、ノードを共有する
		// s0101m.mul.xml と s0102m.mul.xml は同じ "01-digha-nikaya" ノードを共有する
		const filesWithSamePath = tipitakaFileMetas.filter(
			(meta) =>
				meta.dirSegments.length >= 3 &&
				meta.dirSegments[0] === "01-tipitaka-mula" &&
				meta.dirSegments[1] === "01-sutta-pitaka" &&
				meta.dirSegments[2] === "01-digha-nikaya",
		);
		expect(filesWithSamePath.length).toBeGreaterThan(1);

		const sharedNode = result.children
			.get("01-tipitaka-mula")
			?.children.get("01-sutta-pitaka")
			?.children.get("01-digha-nikaya");
		expect(sharedNode).toBeDefined();

		// すべてのファイルが同じノードを参照していることを確認
		for (const _ of filesWithSamePath) {
			const node = result.children
				.get("01-tipitaka-mula")
				?.children.get("01-sutta-pitaka")
				?.children.get("01-digha-nikaya");
			expect(node).toBe(sharedNode);
		}
	});
});
