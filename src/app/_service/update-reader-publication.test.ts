import { beforeEach, expect, it, vi } from "vitest";

const { store, pending, remove } = vi.hoisted(() => ({
	store: vi.fn(),
	pending: vi.fn(),
	remove: vi.fn(),
}));
vi.mock("../../db/mutations", () => ({
	storeReaderCacheInvalidations: store,
	deleteReaderCacheInvalidations: remove,
}));
vi.mock("../../db/queries", () => ({ fetchReaderCacheInvalidations: pending }));

import { updateReaderPublication } from "./update-reader-publication";

beforeEach(() => {
	vi.resetAllMocks();
	pending.mockResolvedValue([]);
});

it("変更タグを永続化して同じWorkerのキャッシュ削除が完了してから取得した版を消す", async () => {
	const rows = [{ tag: `reader:${"a".repeat(64)}`, version: "v1" }];
	pending.mockResolvedValue(rows);
	const purge = vi.fn().mockResolvedValue(undefined);
	await updateReaderPublication([{ key: "page:12" }], purge);
	expect(store).toHaveBeenCalledWith(
		[expect.stringMatching(/^reader:[a-f0-9]{64}$/)],
		expect.any(String),
	);
	expect(purge).toHaveBeenCalledWith(rows.map((row) => row.tag));
	expect(remove).toHaveBeenCalledWith(rows);
	expect(store.mock.invocationCallOrder[0]).toBeLessThan(
		purge.mock.invocationCallOrder[0],
	);
	expect(purge.mock.invocationCallOrder[0]).toBeLessThan(
		remove.mock.invocationCallOrder[0],
	);
});

it("キャッシュ削除に失敗したら未処理タグを残して保存を失敗にする", async () => {
	pending.mockResolvedValue([
		{ tag: `reader:${"a".repeat(64)}`, version: "v1" },
	]);
	const purge = vi.fn().mockRejectedValue(new Error("purge failed"));
	await expect(updateReaderPublication([], purge)).rejects.toThrow(
		"purge failed",
	);
	expect(remove).not.toHaveBeenCalled();
});

it("同内容を再保存してDB差分がなくても未処理タグの削除を完了する", async () => {
	const rows = [{ tag: `reader:${"a".repeat(64)}`, version: "v1" }];
	pending.mockResolvedValue(rows);
	const purge = vi.fn().mockResolvedValue(undefined);
	await updateReaderPublication([], purge);
	expect(store).not.toHaveBeenCalled();
	expect(purge).toHaveBeenCalledWith(rows.map((row) => row.tag));
	expect(remove).toHaveBeenCalledWith(rows);
});

it("変更も未処理タグもないときはキャッシュを削除しない", async () => {
	const purge = vi.fn();
	await updateReaderPublication([], purge);
	expect(purge).not.toHaveBeenCalled();
});
