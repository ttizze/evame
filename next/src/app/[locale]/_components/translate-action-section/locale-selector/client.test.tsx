import { TranslationStatus } from "@prisma/client";
import type { TranslationJob } from "@prisma/client";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LocaleSelector } from "./client";
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
}));
vi.mock("@/i18n/routing", () => ({
	usePathname: () => "/test",
}));

vi.mock("./lib/type-Icon.client", () => ({
	TypeIcon: ({
		code,
	}: {
		code: string;
		sourceLocale: string;
		translationJobs?: TranslationJob[];
	}) => <div data-testid="type-icon">{code}</div>,
}));
vi.mock("./hooks/use-locale-list-auto-refresh.client", () => ({
	useLocaleListAutoRefresh: () => {},
}));
const pushMock = vi.fn();
vi.mock("../hooks/use-combined-router", () => ({
	useCombinedRouter: () => ({
		push: pushMock,
	}),
}));

describe("LocaleSelector", () => {
	beforeEach(() => {
		pushMock.mockReset();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("renders button with the selected locale name and icon", () => {
		render(
			<LocaleSelector sourceLocale="en" onAddNew={() => {}} showIcons={true} />,
		);

		// useLocale は "en" を返すので、buildLocaleOptions により選択肢は "English" と "French" になり、
		// selectedOption は "en" のため "English" が表示される
		expect(screen.getByText("English")).toBeInTheDocument();
		// showIcons が true のため、TypeIcon がレンダリングされる
		expect(screen.getAllByTestId("type-icon")[0]).toHaveTextContent("en");
	});
	it("opens popover and displays locale options", async () => {
		const user = await userEvent.setup();
		render(
			<LocaleSelector
				sourceLocale="en"
				onAddNew={vi.fn()}
				showIcons={false}
				translationJobs={[
					{
						locale: "ja",
						status: TranslationStatus.COMPLETED,
					} as TranslationJob,
				]}
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

	it("calls router.push with the selected locale on command item select", async () => {
		const user = userEvent.setup();
		render(
			<LocaleSelector
				sourceLocale="en"
				onAddNew={() => {}}
				showIcons={false}
				// 存在するロケールとして "fr" を追加（buildLocaleOptions で "en" と "fr" の 2 件が生成される）
				translationJobs={[
					{
						locale: "fr",
						status: TranslationStatus.COMPLETED,
					} as TranslationJob,
				]}
			/>,
		);

		// ポップオーバーを開くため、ボタンをクリック
		const button = screen.getByTestId("locale-selector-button");
		await user.click(button);

		// "French" の選択肢が表示されるはず
		const frenchOption = screen.getByText("français");
		await user.click(frenchOption);

		// handleLocaleChange により router.push が呼ばれることを検証
		expect(pushMock).toHaveBeenCalledWith(
			{ pathname: "/test", params: {} },
			{ locale: "fr" },
		);
	});

	it("calls onAddNew when the Add New button is clicked", async () => {
		const onAddNewMock = vi.fn();
		const user = userEvent.setup();
		render(
			<LocaleSelector
				sourceLocale="en"
				onAddNew={onAddNewMock}
				showIcons={false}
			/>,
		);

		// ポップオーバーを開く
		const button = screen.getByTestId("locale-selector-button");
		await user.click(button);

		// Add New ボタンのクリックをシミュレーション
		const addNewButton = screen.getByText("+ Add New");
		await user.click(addNewButton);

		expect(onAddNewMock).toHaveBeenCalled();
	});
});
