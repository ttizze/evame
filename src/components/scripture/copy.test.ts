import { describe, expect, it } from "vitest";
import { supportedLocales } from "@/domain/locales";
import { getScriptureCopy } from "./copy";

describe("仏典画面の共通コピー", () => {
	it("originの5言語は代表的な翻訳UI文言を持つ", () => {
		expect(getScriptureCopy("en").by).toBe("by:");
		expect(getScriptureCopy("ja").by).toBe("作成者:");
		expect(getScriptureCopy("es").by).toBe("por:");
		expect(getScriptureCopy("ko").by).toBe("작성자:");
		expect(getScriptureCopy("zh").by).toBe("作者:");
	});

	it("5言語以外の対応localeは英語コピーを共有する", () => {
		const english = getScriptureCopy("en");
		const localized = new Set(["en", "ja", "es", "ko", "zh"]);

		for (const locale of supportedLocales) {
			const labels = getScriptureCopy(locale.code);
			if (!localized.has(locale.code)) {
				expect(labels).toBe(english);
			}
		}
	});

	it("404の案内を5言語で表示し、それ以外は英語へフォールバックする", () => {
		expect(getScriptureCopy("ja")).toMatchObject({
			notFoundTitle: "仏典が見つかりません",
			notFoundDescription:
				"指定されたテキストはこのコレクションでは利用できません。",
			backToCollection: "コレクションに戻る",
		});
		expect(getScriptureCopy("es")).toMatchObject({
			notFoundTitle: "Escritura no encontrada",
			notFoundDescription:
				"El texto solicitado no está disponible en esta colección.",
			backToCollection: "Volver a la colección",
		});
		expect(getScriptureCopy("ko")).toMatchObject({
			notFoundTitle: "경전을 찾을 수 없습니다",
			notFoundDescription: "요청한 텍스트는 이 컬렉션에서 사용할 수 없습니다.",
			backToCollection: "컬렉션으로 돌아가기",
		});
		expect(getScriptureCopy("zh")).toMatchObject({
			notFoundTitle: "未找到经典",
			notFoundDescription: "请求的文本在此经典集中不可用。",
			backToCollection: "返回经典列表",
		});

		expect(getScriptureCopy("ar")).toMatchObject({
			notFoundTitle: "Scripture not found",
			notFoundDescription:
				"The requested text is not available in this collection.",
			backToCollection: "Back to the collection",
		});
	});
});
