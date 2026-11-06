import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useHeaderScroll } from "./use-header-scroll";

const scroll = vi.hoisted(() => ({ notify: (_y: number) => {} }));
vi.mock("./scroll-y-store", () => ({
	subscribeScrollY: (notify: (y: number) => void) => {
		scroll.notify = notify;
		return () => {};
	},
}));

beforeEach(() => {
	vi.useFakeTimers();
	vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) =>
		window.setTimeout(() => callback(0), 0),
	);
	Object.defineProperty(window, "scrollY", { value: 0, configurable: true });
});
afterEach(() => {
	vi.useRealTimers();
	vi.restoreAllMocks();
});
it("記事ヘッダーより上では目次を固定せず、通過後の上スクロールで固定する", () => {
	const node = document.createElement("div");
	vi.spyOn(node, "getBoundingClientRect").mockReturnValue({
		top: 200,
	} as DOMRect);
	const { result } = renderHook(() => {
		const value = useHeaderScroll();
		Object.assign(value.headerRef, { current: node });
		return value;
	});
	act(() => {
		scroll.notify(150);
		vi.runAllTimers();
	});
	expect(result.current.isPinned).toBe(false);
	expect(result.current.isVisible).toBe(true);
	act(() => {
		scroll.notify(350);
		vi.runAllTimers();
	});
	expect(result.current.isPinned).toBe(false);
	expect(result.current.isVisible).toBe(false);
	act(() => {
		scroll.notify(300);
		vi.runAllTimers();
	});
	expect(result.current.isPinned).toBe(true);
	expect(result.current.isVisible).toBe(true);
	act(() => {
		scroll.notify(100);
		vi.runAllTimers();
	});
	expect(result.current.isPinned).toBe(false);
	expect(result.current.isVisible).toBe(true);
});
