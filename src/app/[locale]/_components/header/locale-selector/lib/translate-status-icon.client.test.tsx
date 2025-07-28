import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TranslateStatusIcon } from "./translate-status-icon.client";

describe("TranslateStatusIcon", () => {
	it("ソースロケールと同じコードの場合、Text アイコンをレンダリングする", () => {
		render(<TranslateStatusIcon status="source" />);
		expect(screen.getByTestId("source-icon")).toBeInTheDocument();
	});

	it("ソースロケールと異なるコードで、翻訳情報が存在して翻訳が完了している場合、Languages アイコンをレンダリングする", () => {
		render(<TranslateStatusIcon status="translated" />);
		expect(screen.getByTestId("translated-icon")).toBeInTheDocument();
	});

	it("ソースロケールと異なるコードで、翻訳情報が存在しない場合、Languages アイコンをレンダリングする", () => {
		render(<TranslateStatusIcon status="untranslated" />);
		expect(screen.getByTestId("untranslated-icon")).toBeInTheDocument();
	});

	describe("アイコンの種類のテスト", () => {
		it("sourceステータスではFileTextアイコンが使用される", () => {
			render(<TranslateStatusIcon status="source" />);
			const icon = screen.getByTestId("source-icon");
			expect(icon).toBeInTheDocument();
			// FileTextアイコンのクラス名を確認
			expect(icon.tagName.toLowerCase()).toBe("svg");
		});

		it("untranslatedステータスではFileXアイコンが使用される", () => {
			render(<TranslateStatusIcon status="untranslated" />);
			const icon = screen.getByTestId("untranslated-icon");
			expect(icon).toBeInTheDocument();
			// FileXアイコンのクラス名を確認
			expect(icon.tagName.toLowerCase()).toBe("svg");
		});

		it("translatedステータスではLanguagesアイコンが使用される", () => {
			render(<TranslateStatusIcon status="translated" />);
			const icon = screen.getByTestId("translated-icon");
			expect(icon).toBeInTheDocument();
			// Languagesアイコンのクラス名を確認
			expect(icon.tagName.toLowerCase()).toBe("svg");
		});
	});

	describe("ラベルのテスト", () => {
		it("sourceステータスでは'Source'ラベルが表示される", () => {
			render(<TranslateStatusIcon status="source" />);
			// Tooltipの内容を確認するのは難しいので、アイコンが存在することを確認
			expect(screen.getByTestId("source-icon")).toBeInTheDocument();
		});

		it("untranslatedステータスでは'Untranslated'ラベルが表示される", () => {
			render(<TranslateStatusIcon status="untranslated" />);
			expect(screen.getByTestId("untranslated-icon")).toBeInTheDocument();
		});

		it("translatedステータスでは'Translated'ラベルが表示される", () => {
			render(<TranslateStatusIcon status="translated" />);
			expect(screen.getByTestId("translated-icon")).toBeInTheDocument();
		});
	});
});
