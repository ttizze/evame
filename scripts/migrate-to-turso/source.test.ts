import { describe, expect, it } from "vitest";
import { loadSourceSnapshot, sourceQueries } from "./source";

describe("loadSourceSnapshot", () => {
	it("公開Tipitaka用の最小列だけを読み、認証秘密値を取得しない", async () => {
		const calls: Array<{ query: string; values: readonly unknown[] }> = [];
		const client = {
			query: async <Row extends Record<string, unknown>>(
				query: string,
				values: readonly unknown[] = [],
			): Promise<{ rows: Row[] }> => {
				calls.push({ query, values });
				if (query === sourceQueries.page) {
					return {
						rows: [
							{
								id: 1,
								content_kind: "PAGE",
								slug: "tipitaka",
								title: "Tipiṭaka",
								source_locale: "pi",
								owner_user_id: "u1",
								parent_id: null,
								position: 0,
								status: "PUBLIC",
								published_at: "2025-01-01T00:00:00.000Z",
								created_at: "2025-01-01T00:00:00.000Z",
							},
						] as unknown as Row[],
					};
				}
				if (query === sourceQueries.segment) {
					return {
						rows: [
							{
								id: 2,
								content_id: 1,
								position: 0,
								kind: "PRIMARY",
								source_text: "Tipiṭaka",
								created_at: "2025-01-01T00:00:00.000Z",
							},
						] as unknown as Row[],
					};
				}
				if (query === sourceQueries.translation) {
					return {
						rows: [
							{
								id: 3,
								segment_id: 2,
								locale: "ja",
								text: "三蔵",
								point: 1,
								user_id: "u1",
								created_at: "2025-01-01T00:00:00.000Z",
							},
						] as unknown as Row[],
					};
				}
				if (query === sourceQueries.translationJob) {
					return {
						rows: [
							{
								id: 4,
								page_id: 1,
								locale: "ja",
								model: "model",
								status: "IN_PROGRESS",
								progress: 1,
								error: "",
								requested_by: "u1",
								created_at: "2025-01-01T00:00:00.000Z",
								updated_at: "2025-01-01T00:00:00.000Z",
							},
						] as unknown as Row[],
					};
				}
				if (query === sourceQueries.user) {
					return {
						rows: [
							{
								id: "u1",
								email: "u1@example.com",
								name: "User",
								is_ai: true,
								created_at: "2025-01-01T00:00:00.000Z",
							},
						] as unknown as Row[],
					};
				}
				if (query === sourceQueries.vote) {
					return {
						rows: [
							{
								translation_id: 3,
								user_id: "u1",
								is_upvote: true,
								created_at: "2025-01-01T00:00:00.000Z",
								updated_at: "2025-01-01T00:00:00.000Z",
							},
						] as unknown as Row[],
					};
				}
				return {
					rows: [
						{
							main_segment_id: 2,
							annotation_segment_id: 2,
							created_at: "2025-01-01T00:00:00.000Z",
						},
					] as unknown as Row[],
				};
			},
		};

		const snapshot = await loadSourceSnapshot(client, "tipitaka");

		expect(calls).toHaveLength(7);
		expect(calls.every((call) => call.values[0] === "tipitaka")).toBe(true);
		expect(snapshot.users[0]).toMatchObject({ id: "u1", isAi: true });
		expect(snapshot.pages[0]).toMatchObject({ ownerUserId: "u1" });
		expect(snapshot.translations[0]).toMatchObject({
			id: 3,
			userId: "u1",
		});
		expect(snapshot.translationJobs[0]).toMatchObject({
			id: 4,
			pageId: 1,
			requestedBy: "u1",
			status: "IN_PROGRESS",
		});
		for (const query of Object.values(sourceQueries)) {
			expect(query).not.toMatch(
				/password|refresh_token|access_token|token_hash/i,
			);
		}
	});
});
