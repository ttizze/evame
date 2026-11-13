import { afterEach, expect, it, vi } from "vitest";

const tweets = vi.hoisted(() => ({ loads: 0, render: vi.fn() }));
vi.mock("./tweets", () => {
	tweets.loads++;
	return { renderTweets: tweets.render };
});
afterEach(() => {
	document.body.replaceChildren();
	vi.unstubAllGlobals();
});

it("画面外の埋め込みはコードを読み込まず、表示位置へ近づいた埋め込みだけを一度ずつ起動する", async () => {
	document.body.innerHTML =
		'<div data-tweet-id="1"></div><div data-tweet-id="2"></div>';
	let update!: (
		entries: { target: Element; isIntersecting: boolean }[],
	) => void;
	const observe = vi.fn();
	const unobserve = vi.fn();
	vi.stubGlobal(
		"IntersectionObserver",
		class {
			observe = observe;
			unobserve = unobserve;
			constructor(callback: typeof update) {
				update = callback;
			}
		},
	);
	await import("./tweets.client");
	expect(observe).toHaveBeenCalledTimes(2);
	expect(tweets.loads).toBe(0);
	const first = document.querySelector('[data-tweet-id="1"]')!;
	const second = document.querySelector('[data-tweet-id="2"]')!;
	update([
		{ target: first, isIntersecting: true },
		{ target: second, isIntersecting: false },
	]);
	await vi.waitFor(() => expect(tweets.render).toHaveBeenCalledWith([first]));
	expect(unobserve).toHaveBeenCalledWith(first);
	expect(unobserve).not.toHaveBeenCalledWith(second);
	update([{ target: second, isIntersecting: true }]);
	await vi.waitFor(() => expect(tweets.render).toHaveBeenCalledTimes(2));
	expect(tweets.loads).toBe(1);
});
