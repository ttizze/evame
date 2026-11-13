import { afterEach, beforeEach, expect, it, vi } from "vitest";
import "./home-feed.client";

const fetchFeed = vi.fn();

beforeEach(() => {
	vi.useFakeTimers();
	vi.stubGlobal("fetch", fetchFeed);
	fetchFeed.mockReset();
	document.body.innerHTML = `<evame-home-feed data-locale="ja"><p data-home-error hidden>読み込み失敗<button data-home-retry>再試行</button></p><div data-home-pages><a href="/ja/alice/old">更新前の記事</a></div></evame-home-feed>`;
});

afterEach(() => {
	document.body.replaceChildren();
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

it("最初のHTMLをそのまま表示し、30秒後に記事一覧のHTMLだけを更新する", async () => {
	fetchFeed.mockResolvedValue(
		new Response(
			'<div data-home-pages><a href="/ja/alice/new">新しい記事</a></div>',
		),
	);
	expect(fetchFeed).not.toHaveBeenCalled();
	expect(document.querySelector("a")?.textContent).toBe("更新前の記事");
	await vi.advanceTimersByTimeAsync(30000);
	expect(fetchFeed.mock.calls[0][0]).toBe("/api/home-feed?locale=ja");
	expect(document.querySelector("a")?.getAttribute("href")).toBe(
		"/ja/alice/new",
	);
	expect(
		document.querySelector("[data-home-error]")?.hasAttribute("hidden"),
	).toBe(true);
});

it("更新に失敗しても表示済みの記事を残し、再試行ボタンで回復できる", async () => {
	fetchFeed.mockResolvedValueOnce(new Response(null, { status: 503 }));
	await vi.advanceTimersByTimeAsync(30000);
	expect(document.querySelector("a")?.textContent).toBe("更新前の記事");
	expect(
		document.querySelector("[data-home-error]")?.hasAttribute("hidden"),
	).toBe(false);
	fetchFeed.mockResolvedValueOnce(
		new Response("<div data-home-pages>更新後の記事</div>"),
	);
	(document.querySelector("[data-home-retry]") as HTMLButtonElement).click();
	await vi.advanceTimersByTimeAsync(0);
	expect(document.querySelector("[data-home-pages]")?.textContent).toBe(
		"更新後の記事",
	);
	expect(
		document.querySelector("[data-home-error]")?.hasAttribute("hidden"),
	).toBe(true);
});

it("不正なHTML応答では一覧を消さず、更新エラーを表示する", async () => {
	fetchFeed.mockResolvedValue(new Response("<html>ログインページ</html>"));
	await vi.advanceTimersByTimeAsync(30000);
	expect(document.querySelector("a")?.textContent).toBe("更新前の記事");
	expect(
		document.querySelector("[data-home-error]")?.hasAttribute("hidden"),
	).toBe(false);
});

it("更新中にフォーカスが一覧内にあるときは操作対象を置き換えない", async () => {
	fetchFeed.mockResolvedValue(
		new Response("<div data-home-pages>更新後の記事</div>"),
	);
	(document.querySelector("a") as HTMLAnchorElement).focus();
	await vi.advanceTimersByTimeAsync(30000);
	expect(document.activeElement?.textContent).toBe("更新前の記事");
	expect(document.querySelector("a")?.textContent).toBe("更新前の記事");
});

it("ページから外れるとタイマーと進行中の通信を止める", async () => {
	fetchFeed.mockImplementation(() => new Promise(() => {}));
	await vi.advanceTimersByTimeAsync(30000);
	const signal = fetchFeed.mock.calls[0][1].signal as AbortSignal;
	document.body.replaceChildren();
	expect(signal.aborted).toBe(true);
	await vi.advanceTimersByTimeAsync(60000);
	expect(fetchFeed).toHaveBeenCalledTimes(1);
});

it("一覧の内容が変わらなければ表示済みのカードといいねの状態を保つ", async () => {
	const pages = document.querySelector<HTMLElement>("[data-home-pages]")!;
	pages.dataset.homeVersion = "same-content";
	fetchFeed.mockResolvedValue(
		new Response(
			'<div data-home-pages data-home-version="same-content">更新前の記事</div>',
		),
	);
	await vi.advanceTimersByTimeAsync(30000);
	expect(document.querySelector("[data-home-pages]")).toBe(pages);
});
