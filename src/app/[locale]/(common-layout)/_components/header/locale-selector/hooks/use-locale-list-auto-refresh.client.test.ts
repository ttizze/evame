import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
// useLocaleListAutoRefresh.test.ts
import type { TranslationJob } from "@/db/types.helpers";
import { useLocaleListAutoRefresh } from "./use-locale-list-auto-refresh.client";

// モック用の refresh 関数
const refreshMock = vi.fn();

// useCombinedRouter をモック化して、常に refreshMock を返すようにする
vi.mock("./use-combined-router", () => ({
	useCombinedRouter: () => ({
		refresh: refreshMock,
	}),
}));

describe("useLocaleListAutoRefresh", () => {
	beforeEach(() => {
		refreshMock.mockClear();
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("pageAITranslationInfo が undefined の場合、refresh は呼ばれない", () => {
		renderHook(() => useLocaleListAutoRefresh(undefined));
		vi.advanceTimersByTime(5000);
		expect(refreshMock).not.toHaveBeenCalled();
	});

	it("pageAITranslationInfo が空配列の場合、refresh は呼ばれない", () => {
		renderHook(() => useLocaleListAutoRefresh([]));
		vi.advanceTimersByTime(5000);
		expect(refreshMock).not.toHaveBeenCalled();
	});

	it("全ての翻訳情報が COMPLETED の場合、refresh は呼ばれない", () => {
		const translationInfos = [
			{
				locale: "en",
				status: "COMPLETED",
			} as TranslationJob,
			{
				locale: "fr",
				status: "COMPLETED",
			} as TranslationJob,
		];
		renderHook(() => useLocaleListAutoRefresh(translationInfos));
		vi.advanceTimersByTime(5000);
		expect(refreshMock).not.toHaveBeenCalled();
	});

	it("少なくとも1件が COMPLETED 以外の場合、refresh が呼ばれる", () => {
		const translationInfos = [
			{
				locale: "en",
				status: "IN_PROGRESS",
			} as TranslationJob,
			{
				locale: "fr",
				status: "COMPLETED",
			} as TranslationJob,
		];
		renderHook(() => useLocaleListAutoRefresh(translationInfos));
		vi.advanceTimersByTime(5000);
		expect(refreshMock).toHaveBeenCalledTimes(1);
	});

	it("指定した間隔ごとに refresh が繰り返し呼ばれる", () => {
		const translationInfos = [
			{
				locale: "en",
				status: "IN_PROGRESS",
			} as TranslationJob,
		];
		renderHook(() => useLocaleListAutoRefresh(translationInfos));
		vi.advanceTimersByTime(15000); // 5000ms × 3
		expect(refreshMock).toHaveBeenCalledTimes(3);
	});

	it("コンポーネントのアンマウント時に interval がクリアされる", () => {
		const translationInfos = [
			{
				locale: "en",
				status: "IN_PROGRESS",
			} as TranslationJob,
		];
		const { unmount } = renderHook(() =>
			useLocaleListAutoRefresh(translationInfos),
		);
		vi.advanceTimersByTime(5000);
		expect(refreshMock).toHaveBeenCalledTimes(1);
		unmount();
		vi.advanceTimersByTime(5000);
		// アンマウント後は refresh が追加で呼ばれないはず
		expect(refreshMock).toHaveBeenCalledTimes(1);
	});
});
