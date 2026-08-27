import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
	buildTipitakaCategoryHierarchy,
	buildTipitakaHierarchy,
	classifyTipitakaLevel,
	readTipitakaManifest,
} from "../manifest";

describe("Tipitaka manifest", () => {
	it("MulaをPRIMARY、注釈書をCOMMENTARYとして分類する", () => {
		expect(classifyTipitakaLevel("Mula")).toBe("PRIMARY");
		expect(classifyTipitakaLevel("Other")).toBe("PRIMARY");
		expect(classifyTipitakaLevel("Atthakatha")).toBe("COMMENTARY");
		expect(classifyTipitakaLevel("Tika")).toBe("COMMENTARY");
	});

	it("ファイルメタデータから親子・順序・安定slugを作る", () => {
		const hierarchy = buildTipitakaHierarchy([
			{
				fileKey: "s0101m.mul.xml",
				level: "Mula",
				dirSegments: [
					"01-tipitaka-mula",
					"01-sutta-pitaka",
					"01-digha-nikaya",
					"01-silakkhandhavaggapali",
				],
				mulaFileName: null,
			},
			{
				fileKey: "s0101a.att.xml",
				level: "Atthakatha",
				dirSegments: [
					"02-atthakatha",
					"01-sutta-pitaka-atthakatha",
					"01-digha-nikaya-atthakatha",
					"01-silakkhandhavaggapali-atthakatha",
				],
				mulaFileName: "s0101m.mul.xml",
			},
		]);

		expect(hierarchy).toMatchObject([
			{
				fileKey: "s0101m.mul.xml",
				kind: "PRIMARY",
				slug: "tipitaka-s0101m-mul",
				title: "Silakkhandhavaggapali",
				parentSlug: "tipitaka-01-tipitaka-mula-01-sutta-pitaka-01-digha-nikaya",
				position: 1,
				mulaFileKey: null,
			},
			{
				fileKey: "s0101a.att.xml",
				kind: "COMMENTARY",
				slug: "tipitaka-s0101a-att",
				title: "Silakkhandhavaggapali Atthakatha",
				parentSlug:
					"tipitaka-02-atthakatha-01-sutta-pitaka-atthakatha-01-digha-nikaya-atthakatha",
				position: 1,
				mulaFileKey: "s0101m.mul.xml",
			},
		]);
	});

	it("未知のレベルは明示的に拒否する", () => {
		expect(() => classifyTipitakaLevel("Supplement")).toThrow(
			/Unsupported Tipitaka level/,
		);
	});

	it("書籍の最終ディレクトリを除いたカテゴリ階層を作る", () => {
		const entries = buildTipitakaHierarchy([
			{
				fileKey: "a.mul.xml",
				level: "Mula",
				dirSegments: ["01-mula", "01-sutta", "01-book"],
				mulaFileName: null,
			},
			{
				fileKey: "b.mul.xml",
				level: "Mula",
				dirSegments: ["01-mula", "01-sutta", "02-book"],
				mulaFileName: null,
			},
		]);

		expect(buildTipitakaCategoryHierarchy(entries)).toEqual([
			{
				dirPath: "01-mula",
				slug: "tipitaka-01-mula",
				title: "Mula",
				parentSlug: "tipitaka",
				position: 1,
			},
			{
				dirPath: "01-mula/01-sutta",
				slug: "tipitaka-01-mula-01-sutta",
				title: "Sutta",
				parentSlug: "tipitaka-01-mula",
				position: 1,
			},
		]);
	});

	it("既存books.jsonを読み込み、入力ファイルを変更しない", async () => {
		const manifest = await readTipitakaManifest(
			resolve(import.meta.dirname, "fixtures/books.json"),
		);

		expect(manifest).toHaveLength(1);
		expect(manifest[0]).toMatchObject({
			fileKey: "s0101m.mul.xml",
			kind: "PRIMARY",
			slug: "tipitaka-s0101m-mul",
		});
	});

	it("既定manifestは新しいTipitaka資産だけから読み込める", async () => {
		const manifest = await readTipitakaManifest();

		expect(manifest).toHaveLength(217);
		expect(manifest[0]).toMatchObject({
			fileKey: "s0101m.mul.xml",
			kind: "PRIMARY",
		});
	});
});
