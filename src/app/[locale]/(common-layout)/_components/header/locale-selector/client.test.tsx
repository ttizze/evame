import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LocaleSelector } from "./client";

const translationDialog = vi.hoisted(() => ({ loads: 0 }));
vi.mock("./add-translate-dialog/client", async (importOriginal) => {
	translationDialog.loads++;
	return importOriginal();
});

if (typeof global.ResizeObserver === "undefined") {
	global.ResizeObserver = class {
		observe() {}
		unobserve() {}
		disconnect() {}
	};
}
if (typeof window.HTMLElement.prototype.scrollIntoView !== "function") {
	window.HTMLElement.prototype.scrollIntoView = () => {};
}
// use-intl and TanStack Router hooks are mocked for the isolated component test.
const mockTranslations = () => {
	const t = ((key: string) => key) as unknown as {
		(key: string): string;
		rich: (key: string) => string;
		markup: (key: string) => string;
		raw: (key: string) => string;
		has: (key: string) => boolean;
	};
	t.rich = (key) => key;
	t.markup = (key) => key;
	t.raw = (key) => key;
	t.has = () => true;
	return t;
};
vi.mock("use-intl", () => ({
	useLocale: () => "en",
	useTranslations: () => mockTranslations(),
}));

beforeEach(() =>
	window.history.replaceState(null, "", "/en/test?view=both#part"),
);

describe("LocaleSelector", () => {
	it("記事以外の言語切り替えでは翻訳追加フォームを読み込まない", () => {
		render(
			<LocaleSelector
				currentHandle=""
				hasGeminiApiKey={false}
				inMenu={false}
				userPlan="free"
			/>,
		);
		expect(translationDialog.loads).toBe(0);
	});
	it("現在の表示言語をボタンに表示する", () => {
		render(
			<LocaleSelector
				currentHandle=""
				hasGeminiApiKey={false}
				inMenu={false}
				userPlan="free"
			/>,
		);

		// useLocale は "en" を返すので、buildLocaleOptions により選択肢は "English" と "French" になり、
		// selectedOption は "en" のため "English" が表示される
		expect(screen.getByText("English")).toBeInTheDocument();
	});
	it("言語ボタンを押すと選択できる言語が表示される", async () => {
		const user = await userEvent.setup();
		render(
			<LocaleSelector
				currentHandle=""
				hasGeminiApiKey={false}
				inMenu={false}
				userPlan="free"
			/>,
		);
		const button = await screen.findByTestId("locale-selector-button");
		await user.click(button);
		// ポップオーバー内に検索ボックスが表示される
		expect(await screen.findByPlaceholderText("search...")).toBeInTheDocument();
		expect(await screen.findByText("日本語")).toBeInTheDocument();
		const englishElements = screen.getAllByText("English");
		expect(englishElements.length).toBeGreaterThan(0);
	});

	it("言語のリンクは現在のページ・表示モード・見出し位置を維持する", async () => {
		const user = userEvent.setup();
		render(
			<LocaleSelector
				currentHandle=""
				hasGeminiApiKey={false}
				inMenu={false}
				userPlan="free"
			/>,
		);

		// ポップオーバーを開くため、ボタンをクリック
		const button = screen.getByTestId("locale-selector-button");
		await user.click(button);

		// "French" の選択肢が表示されるはず
		const frenchOption = screen.getByText("Français");
		expect(frenchOption.closest("a")).toHaveAttribute(
			"href",
			"/fr/test?view=both#part",
		);
	});
});
