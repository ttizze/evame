// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
import { checkEditorArticle } from "./check-editor-article.mjs";
import { checkEditorBrowser } from "./check-editor-browser.mjs";
import { checkEditorDrag } from "./check-editor-drag.mjs";
import { checkEditorLists } from "./check-editor-lists.mjs";

vi.mock("./check-editor-article.mjs", () => ({ checkEditorArticle: vi.fn() }));
vi.mock("./check-editor-drag.mjs", () => ({ checkEditorDrag: vi.fn() }));
vi.mock("./check-editor-lists.mjs", () => ({ checkEditorLists: vi.fn() }));
beforeEach(() => vi.resetAllMocks());

function browserFixture(name: string) {
	const title = { fill: vi.fn() };
	const editor = { locator: vi.fn(() => title) };
	const page = {
		goto: vi.fn(),
		getByRole: vi.fn(() => ({ click: vi.fn() })),
		getByTestId: vi.fn(() => editor),
		waitForURL: vi.fn(),
	};
	const context = {
		route: vi.fn(),
		addCookies: vi.fn(),
		newPage: vi.fn(async () => page),
		close: vi.fn(),
	};
	const browser = { newContext: vi.fn(async () => context), close: vi.fn() };
	return {
		type: { launch: vi.fn(async () => browser), name: () => name },
		page,
		editor,
		title,
		context,
		browser,
	};
}

it("全件実行では両ブラウザーでD&Dと全リスト操作群を一回ずつ実行する", async () => {
	const chromium = browserFixture("chromium");
	const webkit = browserFixture("webkit");
	await checkEditorBrowser(
		"http://localhost:3000",
		"session=test=value",
		[chromium.type, webkit.type],
		"all",
		"https://images.evame.tech/uploads/test",
	);
	expect(checkEditorDrag).toHaveBeenCalledTimes(2);
	expect(checkEditorArticle).toHaveBeenCalledTimes(2);
	expect(vi.mocked(checkEditorLists).mock.calls.map((call) => call[1])).toEqual(
		[
			"clipboard",
			"structure",
			"formatting",
			"clipboard",
			"structure",
			"formatting",
		],
	);
	for (const fixture of [chromium, webkit]) {
		expect(fixture.browser.newContext).toHaveBeenCalledTimes(4);
		expect(fixture.context.close).toHaveBeenCalledTimes(4);
		expect(fixture.page.goto).toHaveBeenCalledTimes(4);
		expect(fixture.context.addCookies).toHaveBeenCalledWith([
			{
				name: "session",
				value: "test=value",
				url: "http://localhost:3000",
				httpOnly: true,
				sameSite: "Lax",
			},
		]);
		expect(fixture.browser.close).toHaveBeenCalledOnce();
	}
});

it.each(["clipboard", "structure", "formatting"])(
	"分割%sではタイトルを入力した新しい記事で指定した操作群だけ実行する",
	async (group) => {
		const fixture = browserFixture("webkit");
		vi.mocked(checkEditorLists).mockImplementationOnce(async () => {
			expect(fixture.page.getByTestId).toHaveBeenCalledWith("lexical-editor");
			expect(fixture.editor.locator).toHaveBeenCalledWith(
				":scope > h1:first-child",
			);
			expect(fixture.title.fill).toHaveBeenCalledExactlyOnceWith(
				"リスト操作の検証",
			);
		});
		await checkEditorBrowser(
			"http://localhost:3000",
			"session=test",
			[fixture.type],
			`editor-lists-${group}`,
			"https://images.evame.tech/uploads/test",
		);
		expect(checkEditorDrag).not.toHaveBeenCalled();
		expect(checkEditorLists).toHaveBeenCalledExactlyOnceWith(
			fixture.page,
			group,
		);
		expect(fixture.page.goto).toHaveBeenCalledOnce();
		expect(fixture.context.close).toHaveBeenCalledOnce();
	},
);

it("D&D操作群ではリスト操作を重複して実行しない", async () => {
	const fixture = browserFixture("chromium");
	await checkEditorBrowser(
		"http://localhost:3000",
		"session=test",
		[fixture.type],
		"editor-drag",
		"https://images.evame.tech/uploads/test",
	);
	expect(checkEditorDrag).toHaveBeenCalledExactlyOnceWith(fixture.page);
	expect(checkEditorArticle).toHaveBeenCalledExactlyOnceWith(
		fixture.page,
		"https://images.evame.tech/uploads/test",
	);
	expect(checkEditorLists).not.toHaveBeenCalled();
});

it("検証が失敗してもブラウザーを閉じ、失敗を呼び出し元へ返す", async () => {
	const fixture = browserFixture("chromium");
	vi.mocked(checkEditorLists).mockRejectedValueOnce(new Error("保存に失敗"));
	await expect(
		checkEditorBrowser(
			"http://localhost:3000",
			"session=test",
			[fixture.type],
			"editor-lists-structure",
			"https://images.evame.tech/uploads/test",
		),
	).rejects.toThrow("保存に失敗");
	expect(fixture.browser.close).toHaveBeenCalledOnce();
});

it("知らない操作群を黙ってスキップしない", async () => {
	const fixture = browserFixture("chromium");
	await expect(
		checkEditorBrowser(
			"http://localhost:3000",
			"session=test",
			[fixture.type],
			"editor-lists-unknown",
		),
	).rejects.toThrow("Unknown editor suite");
	expect(fixture.type.launch).not.toHaveBeenCalled();
});
