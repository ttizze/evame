import { afterEach, beforeEach, expect, it, vi } from "vitest";
import "./header-actions.client";

const widget = vi.hoisted(() => ({
	loads: 0,
	mount: vi.fn(),
	unmount: vi.fn(),
}));
vi.mock("./header-account", () => {
	widget.loads++;
	return { mountAccountHeader: widget.mount };
});
const fetchState = vi.fn();
beforeEach(() => {
	vi.stubGlobal("fetch", fetchState);
	fetchState.mockReset();
	widget.mount.mockImplementation((container: HTMLElement) => {
		container.textContent = "アカウントメニュー";
		return { unmount: widget.unmount };
	});
});
afterEach(() => {
	document.body.replaceChildren();
	vi.unstubAllGlobals();
	vi.clearAllMocks();
});

function showHeader() {
	document.body.innerHTML = `<evame-header-actions data-locale="ja" data-search=""><div data-header-loading>読込中</div><div data-header-guest hidden><button>Start</button></div><div data-header-account-root hidden></div><template data-header-account-template><button data-create-page="" data-create-locale="ja">執筆</button><button data-header-account aria-label="アカウント"><evame-avatar><span></span><img style="opacity:0" /></evame-avatar><span data-testid="unread-count" hidden></span><span data-unread-description hidden id="reader-unread"></span></button></template></evame-header-actions>`;
}

it("未ログインのヘッダーをReactの起動を待たず表示する", async () => {
	fetchState.mockResolvedValue(
		Response.json({ user: null, unreadCount: 0, unreadDescription: "" }),
	);
	showHeader();
	await vi.waitFor(() =>
		expect(
			(document.querySelector("[data-header-guest]") as HTMLElement).hidden,
		).toBe(false),
	);
	expect(fetchState.mock.calls[0][0]).toBe("/api/reader-header?locale=ja");
	expect(widget.loads).toBe(0);
});

it("ログイン済みのアイコン・執筆・未読件数もアプリを起動せず表示する", async () => {
	fetchState.mockResolvedValue(
		Response.json({
			user: {
				handle: "alice",
				name: "Alice",
				image: "/avatar.png",
				plan: "free",
				hasGeminiApiKey: false,
			},
			unreadCount: 3,
			unreadDescription: "未読通知3件",
		}),
	);
	showHeader();
	await vi.waitFor(() =>
		expect(
			document.querySelector('[data-testid="unread-count"]')?.textContent,
		).toBe("3"),
	);
	expect(
		document.querySelector<HTMLButtonElement>("[data-create-page]")?.dataset
			.createPage,
	).toBe("alice");
	expect(document.querySelector("evame-avatar > span")?.textContent).toBe("A");
	expect(document.querySelector("[data-unread-description]")?.textContent).toBe(
		"未読通知3件",
	);
	expect(widget.loads).toBe(0);
	(
		document.querySelector("[data-header-account]") as HTMLButtonElement
	).click();
	await vi.waitFor(() => expect(widget.mount).toHaveBeenCalledTimes(1));
	expect(widget.loads).toBe(1);
});

it("ヘッダーから外れたら進行中の認証取得を止める", () => {
	fetchState.mockImplementation(() => new Promise(() => {}));
	showHeader();
	const signal = fetchState.mock.calls[0][1].signal as AbortSignal;
	document.body.replaceChildren();
	expect(signal.aborted).toBe(true);
});
