// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
import { checkArticleBrowser } from "./check-article-browser.mjs";
import { checkHeaderBrowser } from "./check-header-browser.mjs";
import { checkPublicBrowser } from "./check-public-browser.mjs";

vi.mock("./check-article-browser.mjs", () => ({
	checkArticleBrowser: vi.fn(),
}));
vi.mock("./check-header-browser.mjs", () => ({ checkHeaderBrowser: vi.fn() }));
beforeEach(() => vi.resetAllMocks());

it.each(["header", "article"])(
	"%sだけを指定したブラウザーで検証して閉じる",
	async (suite) => {
		const browser = { close: vi.fn() };
		const engine = { launch: vi.fn(async () => browser) };
		await checkPublicBrowser(
			[engine],
			suite,
			"http://localhost",
			"session=test",
			"author",
			"page",
		);
		const selected =
			suite === "header" ? checkHeaderBrowser : checkArticleBrowser;
		const other = suite === "header" ? checkArticleBrowser : checkHeaderBrowser;
		expect(selected).toHaveBeenCalledExactlyOnceWith(
			browser,
			"http://localhost",
			"session=test",
			"author",
			"page",
		);
		expect(other).not.toHaveBeenCalled();
		expect(browser.close).toHaveBeenCalledOnce();
	},
);

it("両ブラウザー指定では各ブラウザーを一回ずつ検証する", async () => {
	const chromium = { close: vi.fn() };
	const webkit = { close: vi.fn() };
	await checkPublicBrowser(
		[
			{ launch: vi.fn(async () => chromium) },
			{ launch: vi.fn(async () => webkit) },
		],
		"article",
		"http://localhost",
		"session=test",
		"author",
		"page",
	);
	expect(
		vi.mocked(checkArticleBrowser).mock.calls.map((call) => call[0]),
	).toEqual([chromium, webkit]);
	expect(chromium.close).toHaveBeenCalledOnce();
	expect(webkit.close).toHaveBeenCalledOnce();
});

it("検証失敗でもブラウザーを閉じて失敗を返す", async () => {
	const browser = { close: vi.fn() };
	vi.mocked(checkHeaderBrowser).mockRejectedValueOnce(
		new Error("通知の検証失敗"),
	);
	await expect(
		checkPublicBrowser(
			[{ launch: vi.fn(async () => browser) }],
			"header",
			"http://localhost",
			"session=test",
			"author",
			"page",
		),
	).rejects.toThrow("通知の検証失敗");
	expect(browser.close).toHaveBeenCalledOnce();
});

it("未知の検証群ではブラウザーを起動せず失敗する", async () => {
	const engine = { launch: vi.fn() };
	await expect(
		checkPublicBrowser(
			[engine],
			"unknown",
			"http://localhost",
			"session=test",
			"author",
			"page",
		),
	).rejects.toThrow("Unknown public suite");
	expect(engine.launch).not.toHaveBeenCalled();
});
