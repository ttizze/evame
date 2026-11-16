import { beforeEach, expect, it, vi } from "vitest";

const { pending, remove } = vi.hoisted(() => ({
	pending: vi.fn(),
	remove: vi.fn(),
}));
vi.mock("../../db/mutations", () => ({
	deleteReaderPublicationChanges: remove,
}));
vi.mock("../../db/queries", () => ({ fetchReaderPublicationChanges: pending }));

import { updateReaderPublication } from "./update-reader-publication";

beforeEach(() => {
	vi.resetAllMocks();
	pending.mockResolvedValue([]);
});

it("R2への更新記録が完了してから取得した版だけを保留行から消す", async () => {
	const rows = [{ key: "page:12", revision: 10 }];
	pending.mockResolvedValue(rows);
	const publish = vi.fn().mockResolvedValue(undefined);
	await updateReaderPublication(publish);
	expect(publish).toHaveBeenCalledWith(rows);
	expect(remove).toHaveBeenCalledWith(rows);
	expect(publish.mock.invocationCallOrder[0]).toBeLessThan(
		remove.mock.invocationCallOrder[0],
	);
});
it("R2への反映に失敗したら保留行を残して保存を失敗にする", async () => {
	pending.mockResolvedValue([{ key: "page:12", revision: 10 }]);
	const publish = vi.fn().mockRejectedValue(new Error("publish failed"));
	await expect(updateReaderPublication(publish)).rejects.toThrow(
		"publish failed",
	);
	expect(remove).not.toHaveBeenCalled();
});
it("同内容の再保存でDB差分がなくても未完了のR2反映を完了する", async () => {
	const rows = [{ key: "page:12", revision: 10 }];
	pending.mockResolvedValue(rows);
	const publish = vi.fn().mockResolvedValue(undefined);
	await updateReaderPublication(publish);
	expect(publish).toHaveBeenCalledWith(rows);
	expect(remove).toHaveBeenCalledWith(rows);
});
it("保留行がないときはR2へ書き込まない", async () => {
	const publish = vi.fn();
	await updateReaderPublication(publish);
	expect(publish).not.toHaveBeenCalled();
	expect(remove).not.toHaveBeenCalled();
});
