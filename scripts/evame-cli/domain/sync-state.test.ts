import { describe, expect, it } from "vitest";
import { applyPushResultToState, buildPushRequest } from "./sync-state";

describe("evame-cli sync-state", () => {
	it("push入力はローカルMarkdownのみをUPSERTとして組み立てる", () => {
		const state = {
			slugs: {
				"kept-post": { last_applied_revision: "rev-kept" },
			},
		};

		const payload = buildPushRequest(
			[
				{
					slug: "kept-post",
					title: "Kept",
					body: "keep body",
					published_at: null,
				},
				{
					slug: "new-post",
					title: "New",
					body: "new body",
					published_at: null,
				},
			],
			state,
			false,
		);

		expect(payload).toEqual({
			inputs: [
				{
					slug: "kept-post",
					expected_revision: "rev-kept",
					title: "Kept",
					body: "keep body",
					published_at: null,
				},
				{
					slug: "new-post",
					expected_revision: null,
					title: "New",
					body: "new body",
					published_at: null,
				},
			],
		});
	});

	it("conflict結果ではstateを更新しない", () => {
		const state = {
			slugs: {
				"applied-post": { last_applied_revision: "old-applied" },
				"conflict-post": { last_applied_revision: "old-conflict" },
			},
		};

		const next = applyPushResultToState(
			state,
			{
				status: "conflict",
				results: [
					{
						slug: "conflict-post",
						action: "CONFLICT",
						reason: "revision_mismatch",
					},
				],
			},
			false,
		);

		expect(next).toEqual({
			slugs: {
				"applied-post": { last_applied_revision: "old-applied" },
				"conflict-post": { last_applied_revision: "old-conflict" },
			},
		});
	});
});
