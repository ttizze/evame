import { afterEach, beforeEach, expect, it, vi } from "vitest";
import "./page-likes.client";

const action = vi.hoisted(() => vi.fn());
vi.mock("@/app/_service/reader-action", () => ({ callReaderAction: action }));
const fetchStates = vi.fn();

beforeEach(() => {
	vi.stubGlobal("fetch", fetchStates);
	fetchStates.mockReset();
	action.mockReset();
});
afterEach(() => {
	document.body.replaceChildren();
	vi.unstubAllGlobals();
});

function showCards() {
	document.body.innerHTML = `<evame-page-likes data-page-ids="7,8"><button data-like-page="7" disabled><svg data-like-heart fill="none"></svg><span data-like-pending hidden></span></button><button data-like-page="7" disabled><svg data-like-heart fill="none"></svg><span data-like-pending hidden></span></button><button data-like-page="8" disabled><svg data-like-heart fill="none"></svg><span data-like-pending hidden></span></button></evame-page-likes>`;
}

it("Reactを待たずにいいねを一括取得し、新着と人気に重複する記事へ同じ状態を表示する", async () => {
	fetchStates.mockResolvedValue(
		Response.json({ states: { 7: { liked: true }, 8: { liked: false } } }),
	);
	showCards();
	await vi.waitFor(() =>
		expect(document.querySelector("button")?.disabled).toBe(false),
	);
	expect(fetchStates.mock.calls[0][0]).toBe("/api/page-likes/state?ids=7,8");
	expect(
		[...document.querySelectorAll('[data-like-page="7"] svg')].map((heart) =>
			heart.getAttribute("fill"),
		),
	).toEqual(["currentColor", "currentColor"]);
});

it("押すと同じ記事のハートを即座に更新し、通信中は二重送信を防ぎ、保存した状態を表示する", async () => {
	fetchStates.mockResolvedValue(
		Response.json({ states: { 7: { liked: false } } }),
	);
	showCards();
	await vi.waitFor(() =>
		expect(document.querySelector("button")?.disabled).toBe(false),
	);
	let complete!: (value: unknown) => void;
	action.mockReturnValue(
		new Promise((resolve) => {
			complete = resolve;
		}),
	);
	(document.querySelector("button") as HTMLButtonElement).click();
	expect(action).toHaveBeenCalledWith("like", { pageId: 7 });
	expect(
		[
			...document.querySelectorAll<HTMLButtonElement>('[data-like-page="7"]'),
		].every((button) => button.disabled),
	).toBe(true);
	expect(document.querySelector("svg")?.getAttribute("fill")).toBe(
		"currentColor",
	);
	complete({ success: true, data: { liked: true, likeCount: 1 } });
	await vi.waitFor(() =>
		expect(document.querySelector("button")?.disabled).toBe(false),
	);
	expect(document.querySelector("svg")?.getAttribute("fill")).toBe(
		"currentColor",
	);
});

it("保存に失敗したらハートを戻し、そのまま再試行できる", async () => {
	fetchStates.mockResolvedValue(
		Response.json({ states: { 7: { liked: false } } }),
	);
	showCards();
	await vi.waitFor(() =>
		expect(document.querySelector("button")?.disabled).toBe(false),
	);
	action.mockRejectedValueOnce(new Error("network unavailable"));
	(document.querySelector("button") as HTMLButtonElement).click();
	await vi.waitFor(() =>
		expect(document.querySelector("button")?.disabled).toBe(false),
	);
	expect(document.querySelector("svg")?.getAttribute("fill")).toBe("none");
	action.mockResolvedValueOnce({
		success: true,
		data: { liked: true, likeCount: 1 },
	});
	(document.querySelector("button") as HTMLButtonElement).click();
	await vi.waitFor(() =>
		expect(document.querySelector("button")?.disabled).toBe(false),
	);
	expect(document.querySelector("svg")?.getAttribute("fill")).toBe(
		"currentColor",
	);
});

it("一覧から外れたら進行中の取得を中止する", () => {
	fetchStates.mockImplementation(() => new Promise(() => {}));
	showCards();
	const signal = fetchStates.mock.calls[0][1].signal as AbortSignal;
	document.body.replaceChildren();
	expect(signal.aborted).toBe(true);
});

it("表示モードの起動でボタンが再作成されても、いいねの件数と送信中の状態を引き継ぐ", async () => {
	fetchStates.mockResolvedValue(
		Response.json({ states: { 7: { liked: false, likeCount: 12 } } }),
	);
	showCards();
	const root = document.querySelector("evame-page-likes")!;
	await vi.waitFor(() =>
		expect(document.querySelector("button")?.disabled).toBe(false),
	);
	let complete!: (value: unknown) => void;
	action.mockReturnValue(
		new Promise((resolve) => {
			complete = resolve;
		}),
	);
	document.querySelector<HTMLButtonElement>("button")!.click();
	root.innerHTML =
		'<button data-like-page="7" disabled><svg data-like-heart fill="none"></svg><span data-like-pending hidden></span></button><span data-like-count="7">10</span>';
	await vi.waitFor(() =>
		expect(root.querySelector("[data-like-count]")?.textContent).toBe("13"),
	);
	expect(root.querySelector("button")?.disabled).toBe(true);
	complete({ success: true, data: { liked: true, likeCount: 15 } });
	await vi.waitFor(() =>
		expect(root.querySelector("button")?.disabled).toBe(false),
	);
	expect(root.querySelector("[data-like-count]")?.textContent).toBe("15");
});

it("記事本文とバーのいいね件数を同時に更新し、失敗時は取得した件数へ戻す", async () => {
	fetchStates.mockResolvedValue(
		Response.json({ states: { 7: { liked: false, likeCount: 12 } } }),
	);
	showCards();
	const count = document.createElement("span");
	count.dataset.likeCount = "7";
	count.textContent = "10";
	document.querySelector("evame-page-likes")!.append(count);
	await vi.waitFor(() => expect(count.textContent).toBe("12"));
	let complete!: (value: unknown) => void;
	action.mockReturnValueOnce(
		new Promise((resolve) => {
			complete = resolve;
		}),
	);
	document.querySelector<HTMLButtonElement>("button")!.click();
	expect(count.textContent).toBe("13");
	complete({ success: false });
	await vi.waitFor(() => expect(count.textContent).toBe("12"));
	action.mockResolvedValueOnce({
		success: true,
		data: { liked: true, likeCount: 15 },
	});
	document.querySelector<HTMLButtonElement>("button")!.click();
	await vi.waitFor(() => expect(count.textContent).toBe("15"));
});
