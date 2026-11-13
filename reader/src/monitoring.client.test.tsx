import { afterEach, expect, it, vi } from "vitest";

const sdk = vi.hoisted(() => ({
	initialized: false,
	capture: vi.fn(),
}));
vi.mock("@/instrument.client", () => {
	sdk.initialized = true;
	window.addEventListener("error", (event) =>
		sdk.capture((event as ErrorEvent).error),
	);
	return { captureException: sdk.capture };
});
afterEach(() => vi.unstubAllGlobals());

it("本文の初回描画までSDKの取得を待ち、起動前のエラーも起動後に送信する", async () => {
	const target = new EventTarget();
	vi.stubGlobal("window", target);
	const now = performance.now.bind(performance);
	vi.stubGlobal("performance", { now, getEntriesByType: () => [] });
	let painted!: PerformanceObserverCallback;
	vi.stubGlobal(
		"PerformanceObserver",
		class {
			static supportedEntryTypes = ["paint"];
			constructor(callback: PerformanceObserverCallback) {
				painted = callback;
			}
			observe() {}
			disconnect() {}
		},
	);
	await import("./monitoring.client");
	expect(sdk.initialized).toBe(false);
	const early = new Error("初期化中のエラー");
	target.dispatchEvent(new ErrorEvent("error", { error: early }));
	const rejected = new Error("初期化中の未処理Promise");
	const rejection = new Event("unhandledrejection");
	Object.defineProperty(rejection, "reason", { value: rejected });
	target.dispatchEvent(rejection);
	expect(sdk.capture).not.toHaveBeenCalled();
	painted(
		{
			getEntries: () => [{ name: "first-contentful-paint" }],
		} as unknown as PerformanceObserverEntryList,
		{} as PerformanceObserver,
	);
	await vi.waitFor(() => expect(sdk.capture).toHaveBeenCalledWith(early));
	expect(sdk.initialized).toBe(true);
	const later = new Error("SDK起動後のエラー");
	target.dispatchEvent(new ErrorEvent("error", { error: later }));
	expect(sdk.capture.mock.calls).toEqual([[early], [rejected], [later]]);
});
