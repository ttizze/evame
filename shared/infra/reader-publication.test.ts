import type { R2Bucket } from "@cloudflare/workers-types";
import { afterEach, expect, it, vi } from "vitest";
import { schedulePublication } from "./reader-publication";

afterEach(() => vi.useRealTimers());
it("同じキーを待つ要求はそれぞれ公開処理をwaitUntilへ登録し最新の版を保存する", async () => {
	vi.useFakeTimers();
	const bucket = {
		head: vi.fn().mockResolvedValue(null),
		put: vi.fn().mockResolvedValue({}),
	} as unknown as R2Bucket;
	const first = { waitUntil: vi.fn() };
	const next = { waitUntil: vi.fn() };
	const older = schedulePublication(
		bucket,
		"waitUntil-test",
		1,
		"a",
		"旧本文",
		first,
	);
	const newer = schedulePublication(
		bucket,
		"waitUntil-test",
		2,
		"b",
		"新本文",
		next,
	);
	expect(first.waitUntil).toHaveBeenCalledExactlyOnceWith(older);
	expect(next.waitUntil).toHaveBeenCalledExactlyOnceWith(newer);
	await vi.runAllTimersAsync();
	expect(await older).toBe(204);
	expect(await newer).toBe(204);
	expect(bucket.put).toHaveBeenCalledExactlyOnceWith(
		"waitUntil-test",
		"新本文",
		expect.objectContaining({ customMetadata: { revision: "2", digest: "b" } }),
	);
});
