import { type PageAITranslationInfo, TranslationStatus } from "@prisma/client";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LocaleSelector } from "./index";
import "@testing-library/jest-dom";
import userEvent from "@testing-library/user-event";
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
// next-intl, next/navigation、supportedLocaleOptions をモック
vi.mock(import("next-intl"), async (importOriginal) => {
	const actual = await importOriginal();
	return {
		...actual,
		useLocale: () => "en",
	};
});

vi.mock("next/navigation", () => ({
	useParams: () => ({}),
	usePathname: () => "/",
}));

vi.mock("@/app/constants/locale", () => ({
	supportedLocaleOptions: [
		{ code: "en", name: "English" },
		{ code: "ja", name: "Japanese" },
	],
}));

// useCombinedRouter をモック
import * as routerModule from "../hooks/use-combined-router";
const pushMock = vi.fn();
const refreshMock = vi.fn();
vi.spyOn(routerModule, "useCombinedRouter").mockReturnValue({
	push: pushMock,
	refresh: refreshMock,
	replace: vi.fn(),
	prefetch: vi.fn(),
	back: vi.fn(),
	forward: vi.fn(),
});

describe("LocaleSelector", () => {
	beforeEach(() => {
		pushMock.mockReset();
		refreshMock.mockReset();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("renders with the selected locale", async () => {
		render(
			<NextIntlClientProvider locale="ja">
				<LocaleSelector
					sourceLocale="en"
					onAddNew={vi.fn()}
					showIcons={false}
				/>
			</NextIntlClientProvider>,
		);
		expect(await screen.findByText("English")).toBeInTheDocument();
	});

	it("opens popover and displays locale options", async () => {
		const user = await userEvent.setup();
		render(
			<NextIntlClientProvider locale="ja">
				<LocaleSelector
					sourceLocale="en"
					onAddNew={vi.fn()}
					showIcons={false}
					pageAITranslationInfo={[
						{
							locale: "ja",
							aiTranslationStatus: TranslationStatus.COMPLETED,
						} as PageAITranslationInfo,
					]}
				/>
			</NextIntlClientProvider>,
		);
		const button = await screen.findByTestId("locale-selector-button");
		await user.click(button);
		// ポップオーバー内に検索ボックスが表示される
		expect(await screen.findByPlaceholderText("search...")).toBeInTheDocument();
		// サポートされているロケールがリストに表示される
		expect(await screen.findByText("Japanese")).toBeInTheDocument();
		const englishElements = screen.getAllByText("English");
		expect(englishElements.length).toBeGreaterThan(0);
	});

	it("calls router.push when a different locale is selected", async () => {
		const user = await userEvent.setup();
		render(
			<NextIntlClientProvider locale="ja">
				<LocaleSelector
					sourceLocale="en"
					onAddNew={vi.fn()}
					showIcons={false}
					pageAITranslationInfo={[
						{
							locale: "ja",
							aiTranslationStatus: TranslationStatus.COMPLETED,
						} as PageAITranslationInfo,
					]}
				/>
			</NextIntlClientProvider>,
		);
		const button = await screen.findByTestId("locale-selector-button");
		await user.click(button);
		const japaneseOption = await screen.findByText("Japanese");
		await user.click(japaneseOption);
		await waitFor(() => {
			expect(pushMock).toHaveBeenCalled();
		});
		// router.push の第2引数に locale: "ja" が渡されていることを検証
		expect(pushMock).toHaveBeenCalledWith(
			expect.any(Object), // pathname と params を含むオブジェクト
			{ locale: "ja" },
		);
	});

	it("calls onAddNew when Add New button is clicked", () => {
		const onAddNew = vi.fn();
		render(
			<NextIntlClientProvider locale="ja">
				<LocaleSelector
					sourceLocale="en"
					onAddNew={onAddNew}
					showIcons={false}
				/>
			</NextIntlClientProvider>,
		);
		const button = screen.getByRole("button");
		fireEvent.click(button);
		// ポップオーバー内の「+ Add New」ボタンをクリック
		const addNewButton = screen.getByText("+ Add New");
		fireEvent.click(addNewButton);
		expect(onAddNew).toHaveBeenCalled();
	});

	it("triggers auto refresh when translation is in progress", () => {
		vi.useFakeTimers();
		render(
			<NextIntlClientProvider locale="ja">
				<LocaleSelector
					sourceLocale="en"
					onAddNew={vi.fn()}
					showIcons={false}
					pageAITranslationInfo={[
						{
							locale: "ja",
							aiTranslationStatus: TranslationStatus.IN_PROGRESS, // COMPLETED 以外のステータス
							// その他の必要なプロパティは any として流す
						} as PageAITranslationInfo,
					]}
				/>
			</NextIntlClientProvider>,
		);
		// 5秒進めることで、setInterval のコールバックが呼ばれる
		vi.advanceTimersByTime(5000);
		expect(refreshMock).toHaveBeenCalled();
	});
});
