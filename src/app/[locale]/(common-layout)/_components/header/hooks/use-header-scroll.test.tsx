import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useHeaderScroll } from "./use-header-scroll";

const scroll = vi.hoisted(() => ({ notify: (_y: number) => {} }));
vi.mock("./scroll-y-store", () => ({
	subscribeScrollY: (notify: (y: number) => void) => {
		scroll.notify = (y) => {
			Object.defineProperty(window, "scrollY", {
				value: y,
				configurable: true,
			});
			notify(y);
		};
		return () => {};
	},
}));

beforeEach(() => {
	Object.defineProperty(window, "scrollY", { value: 0, configurable: true });
});
afterEach(() => {
	vi.restoreAllMocks();
});
it("記事ヘッダーより上では目次を固定せず、通過後の上スクロールで固定する", () => {
	const node = document.createElement("div");
	vi.spyOn(node, "getBoundingClientRect").mockImplementation(
		() => new DOMRect(0, 200 - window.scrollY, 400, 72),
	);
	const { result } = renderHook(() => {
		const value = useHeaderScroll();
		Object.assign(value.headerRef, { current: node });
		return value;
	});
	act(() => {
		scroll.notify(150);
	});
	expect(result.current.isPinned).toBe(false);
	expect(result.current.isVisible).toBe(true);
	act(() => {
		scroll.notify(350);
	});
	expect(result.current.isPinned).toBe(false);
	expect(result.current.isVisible).toBe(false);
	act(() => {
		scroll.notify(300);
	});
	expect(result.current.isPinned).toBe(true);
	expect(result.current.isVisible).toBe(true);
	act(() => {
		scroll.notify(100);
	});
	expect(result.current.isPinned).toBe(false);
	expect(result.current.isVisible).toBe(true);
});
it("表示後に記事ヘッダーの位置が変わっても現在の位置で固定と解除を判定する", () => {
	const node = document.createElement("div");
	let top = 900;
	vi.spyOn(node, "getBoundingClientRect").mockImplementation(
		() => new DOMRect(0, top - window.scrollY, 400, 72),
	);
	const { result } = renderHook(() => {
		const value = useHeaderScroll();
		Object.assign(value.headerRef, { current: node });
		return value;
	});
	top = 123;
	act(() => {
		scroll.notify(1000);
	});
	act(() => {
		scroll.notify(700);
	});
	expect(result.current.isPinned).toBe(true);
	expect(result.current.isVisible).toBe(true);
	top = 800;
	act(() => {
		scroll.notify(650);
	});
	expect(result.current.isPinned).toBe(false);
	expect(result.current.isVisible).toBe(true);
});
