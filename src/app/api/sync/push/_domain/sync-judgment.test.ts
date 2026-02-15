import { describe, expect, it } from "vitest";
import { judgeSyncInput } from "./sync-judgment";

describe("judgeSyncInput", () => {
	it("slug未使用は自動適用される", () => {
		const result = judgeSyncInput({
			serverState: "MISSING",
			expectedState: "NONE",
			sameContent: false,
		});
		expect(result).toEqual({ action: "AUTO_APPLY", detail: "UPSERT" });
	});

	it("ARCHIVEページはCLIでは変更せず競合になる", () => {
		const result = judgeSyncInput({
			serverState: "ARCHIVED",
			expectedState: "MATCH",
			sameContent: false,
		});
		expect(result).toEqual({
			action: "CONFLICT",
			reason: "archived_page",
		});
	});

	it("既存ページでexpectedなしかつ同内容なら変更なしになる", () => {
		const result = judgeSyncInput({
			serverState: "ACTIVE",
			expectedState: "NONE",
			sameContent: true,
		});
		expect(result).toEqual({ action: "NO_CHANGE" });
	});

	it("既存ページでexpectedなしかつ内容差分ならcontent_conflictになる", () => {
		const result = judgeSyncInput({
			serverState: "ACTIVE",
			expectedState: "NONE",
			sameContent: false,
		});
		expect(result).toEqual({
			action: "CONFLICT",
			reason: "content_conflict",
		});
	});

	it("expected一致で同内容なら変更なしになる", () => {
		const result = judgeSyncInput({
			serverState: "ACTIVE",
			expectedState: "MATCH",
			sameContent: true,
		});
		expect(result).toEqual({ action: "NO_CHANGE" });
	});

	it("expected一致で内容差分なら自動適用される", () => {
		const result = judgeSyncInput({
			serverState: "ACTIVE",
			expectedState: "MATCH",
			sameContent: false,
		});
		expect(result).toEqual({ action: "AUTO_APPLY", detail: "UPSERT" });
	});

	it("expected不一致ならrevision_mismatchになる", () => {
		const result = judgeSyncInput({
			serverState: "ACTIVE",
			expectedState: "MISMATCH",
			sameContent: false,
		});
		expect(result).toEqual({
			action: "CONFLICT",
			reason: "revision_mismatch",
		});
	});
});
