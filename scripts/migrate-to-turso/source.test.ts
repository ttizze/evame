import { describe, expect, it } from "vitest";
import {
	loadSourceSnapshot,
	preflightSourceSchema,
	sourceQueries,
	sourceSchemaRequirements,
} from "./source";

describe("preflightSourceSchema", () => {
	it("本番sourceの列を照合し、Gemini keyに未確認のtimestampを要求しない", async () => {
		const rows = Object.entries(sourceSchemaRequirements).flatMap(
			([tableName, columnNames]) =>
				columnNames.map((columnName) => ({
					table_name: tableName,
					column_name: columnName,
				})),
		);
		const query = async <Row extends Record<string, unknown>>(
			queryText: string,
			values: readonly unknown[] = [],
		): Promise<{ rows: Row[] }> => {
			expect(queryText).toBe(sourceQueries.schemaPreflight);
			expect(values).toHaveLength(1);
			return { rows: rows as unknown as Row[] };
		};

		await preflightSourceSchema({ query });

		expect(sourceSchemaRequirements.gemini_api_keys).toEqual([
			"id",
			"user_id",
			"api_key",
		]);
	});
});

describe("loadSourceSnapshot", () => {
	it("記事系はrootで絞り、全ユーザーと認証情報を完全な列で読む", async () => {
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
								import_file_id: null,
								parent_id: null,
								position: 0,
								status: "ARCHIVE",
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
								segment_type_id: 1,
								kind: "PRIMARY",
								source_text: "Tipiṭaka",
								text_and_occurrence_hash: "hash-2",
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
								handle: "user-one",
								profile: "Profile",
								total_points: 42,
								is_ai: true,
								image: "https://example.com/u1.png",
								plan: "pro",
								provider: "Credentials",
								twitter_handle: "@user-one",
								email_verified: true,
								created_at: "2025-01-01T00:00:00.000Z",
								updated_at: "2025-01-02T00:00:00.000Z",
							},
						] as unknown as Row[],
					};
				}
				if (query === sourceQueries.account) {
					return {
						rows: [
							{
								id: "account-1",
								user_id: "u1",
								provider_id: "credentials",
								account_id: "u1@example.com",
								refresh_token: "encrypted-refresh",
								access_token: "encrypted-access",
								scope: "openid",
								id_token: "encrypted-id",
								password: null,
								refresh_token_expires_at: null,
								access_token_expires_at: null,
								created_at: "2025-01-01T00:00:00.000Z",
								updated_at: "2025-01-02T00:00:00.000Z",
							},
						] as unknown as Row[],
					};
				}
				if (query === sourceQueries.session) {
					return {
						rows: [
							{
								id: "session-1",
								token: "session-token",
								user_id: "u1",
								expires_at: "2025-02-01T00:00:00.000Z",
								ip_address: "203.0.113.1",
								user_agent: "test-agent",
								created_at: "2025-01-01T00:00:00.000Z",
								updated_at: "2025-01-02T00:00:00.000Z",
							},
						] as unknown as Row[],
					};
				}
				if (query === sourceQueries.verification) {
					return {
						rows: [
							{
								id: "verification-1",
								identifier: "u1@example.com",
								value: "verification-value",
								expires_at: "2025-02-01T00:00:00.000Z",
								created_at: null,
								updated_at: null,
							},
						] as unknown as Row[],
					};
				}
				if (query === sourceQueries.geminiApiKey) {
					return {
						rows: [
							{
								id: 5,
								user_id: "u1",
								api_key: "encrypted-gemini-key",
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
				if (query === sourceQueries.annotationLink) {
					return {
						rows: [
							{
								main_segment_id: 2,
								annotation_segment_id: 2,
								created_at: "2025-01-01T00:00:00.000Z",
							},
						] as unknown as Row[],
					};
				}
				return { rows: [] as Row[] };
			},
		};

		const snapshot = await loadSourceSnapshot(client, "tipitaka");

		expect(calls).toHaveLength(25);
		const rootScopedQueries = new Set<string>([
			sourceQueries.page,
			sourceQueries.segment,
			sourceQueries.translation,
			sourceQueries.translationJob,
			sourceQueries.vote,
			sourceQueries.annotationLink,
		]);
		expect(
			calls
				.filter((call) => rootScopedQueries.has(call.query))
				.every((call) => call.values[0] === "tipitaka"),
		).toBe(true);
		expect(
			calls
				.filter((call) => !rootScopedQueries.has(call.query))
				.every((call) => call.values.length === 0),
		).toBe(true);
		expect(snapshot.users[0]).toEqual({
			id: "u1",
			email: "u1@example.com",
			name: "User",
			handle: "user-one",
			profile: "Profile",
			totalPoints: 42,
			isAi: true,
			image: "https://example.com/u1.png",
			plan: "pro",
			provider: "Credentials",
			twitterHandle: "@user-one",
			emailVerified: true,
			createdAt: "2025-01-01T00:00:00.000Z",
			updatedAt: "2025-01-02T00:00:00.000Z",
		});
		expect(snapshot.accounts[0]).toMatchObject({
			id: "account-1",
			userId: "u1",
			refreshToken: "encrypted-refresh",
		});
		expect(snapshot.sessions[0]).toMatchObject({
			id: "session-1",
			token: "session-token",
			userId: "u1",
		});
		expect(snapshot.verifications[0]).toMatchObject({
			id: "verification-1",
			identifier: "u1@example.com",
		});
		expect(snapshot.geminiApiKeys[0]).toEqual({
			id: 5,
			userId: "u1",
			apiKey: "encrypted-gemini-key",
		});
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
		expect(sourceQueries.user).toContain("updated_at");
		expect(sourceQueries.account).toContain("refresh_token");
		expect(sourceQueries.session).toContain("token");
		expect(sourceQueries.verification).toContain("value");
		expect(sourceQueries.geminiApiKey).toContain("api_key");
		expect(sourceQueries.page).toContain("p.status = 'ARCHIVE'");
		expect(sourceQueries.page).toContain("p.source_locale = 'pi'");
		expect(sourceQueries.page).toContain("child.status = 'ARCHIVE'");
		expect(sourceQueries.page).toContain("child.source_locale = 'pi'");
	});
});
