import { describe, expect, it, vi } from "vitest";
import { runMigration } from "./run";
import type { PostgresSource } from "./source";
import type { TursoConnection } from "./target";
import type { SourceSnapshot } from "./types";

function makeSnapshot(): SourceSnapshot {
	return {
		pages: [
			{
				id: 1,
				contentKind: "PAGE",
				slug: "tipitaka",
				title: "Tipitaka",
				sourceLocale: "pi",
				parentId: null,
				position: 0,
				status: "PUBLIC",
				publishedAt: null,
				createdAt: "2025-01-01T00:00:00.000Z",
			},
		],
		segments: [],
		translations: [],
		translationJobs: [],
		users: [],
		accounts: [],
		sessions: [],
		verifications: [],
		geminiApiKeys: [],
		personalAccessTokens: [],
		importRuns: [],
		importFiles: [],
		likePages: [],
		notifications: [],
		segmentTypes: [],
		pageLocaleTranslationProofs: [],
		segmentMetadataTypes: [],
		tags: [],
		translationContexts: [],
		pageViews: [],
		segmentMetadata: [],
		userSettings: [],
		tagPages: [],
		votes: [],
		annotationLinks: [],
	};
}

function makeSource(): PostgresSource {
	return {
		load: vi.fn(async () => makeSnapshot()),
		close: vi.fn(async () => {}),
	};
}

describe("runMigration", () => {
	it("dry-runではTurso接続と書き込みを行わず件数だけ報告する", async () => {
		const source = makeSource();
		const output: string[] = [];

		const result = await runMigration({
			dryRun: true,
			source,
			stdout: (line) => output.push(line),
		});

		expect(result.actualCounts).toBeNull();
		expect(JSON.parse(output[0] ?? "{}")).toMatchObject({ mode: "dry-run" });
		expect(source.load).toHaveBeenCalledWith("tipitaka");
		expect(source.close).not.toHaveBeenCalled();
	});

	it("dry-runの件数出力へ認証tokenや暗号文を含めない", async () => {
		const snapshot = makeSnapshot();
		snapshot.users = [
			{
				id: "u1",
				email: "u1@example.com",
				name: "User",
				handle: "user-one",
				profile: "",
				totalPoints: 0,
				isAi: false,
				image: "https://example.com/avatar.png",
				plan: "free",
				provider: "Credentials",
				twitterHandle: "",
				emailVerified: null,
				createdAt: "2025-01-01T00:00:00.000Z",
				updatedAt: "2025-01-01T00:00:00.000Z",
			},
		];
		snapshot.accounts = [
			{
				id: "account-1",
				userId: "u1",
				providerId: "credentials",
				accountId: "u1@example.com",
				refreshToken: "ciphertext-refresh",
				accessToken: null,
				scope: null,
				idToken: null,
				password: null,
				refreshTokenExpiresAt: null,
				accessTokenExpiresAt: null,
				createdAt: "2025-01-01T00:00:00.000Z",
				updatedAt: "2025-01-01T00:00:00.000Z",
			},
		];
		snapshot.sessions = [
			{
				id: "session-1",
				token: "session-token-value",
				userId: "u1",
				expiresAt: "2025-02-01T00:00:00.000Z",
				ipAddress: null,
				userAgent: null,
				createdAt: "2025-01-01T00:00:00.000Z",
				updatedAt: "2025-01-01T00:00:00.000Z",
			},
		];
		snapshot.verifications = [];
		snapshot.geminiApiKeys = [
			{ id: 1, userId: "u1", apiKey: "ciphertext-gemini" },
		];
		const source: PostgresSource = {
			load: vi.fn(async () => snapshot),
			close: vi.fn(async () => {}),
		};
		const output: string[] = [];

		await runMigration({
			dryRun: true,
			source,
			stdout: (line) => output.push(line),
		});

		const report = output.join("\n");
		expect(report).not.toContain("ciphertext-refresh");
		expect(report).not.toContain("session-token-value");
		expect(report).not.toContain("ciphertext-gemini");
	});

	it("指定したroot slugをsourceとplanへ渡し、指定ルートを採用する", async () => {
		const source: PostgresSource = {
			load: vi.fn(async () => {
				const snapshot = makeSnapshot();
				snapshot.pages[0]!.slug = "sutta-root";
				return snapshot;
			}),
			close: vi.fn(async () => {}),
		};

		const result = await runMigration({
			dryRun: true,
			rootSlug: "sutta-root",
			source,
		});

		expect(source.load).toHaveBeenCalledWith("sutta-root");
		expect(result.plan.scriptures.map((scripture) => scripture.slug)).toEqual([
			"sutta-root",
		]);
	});

	it("本実行ではupsert後に対象キーの件数を検証する", async () => {
		const source = makeSource();
		const output: string[] = [];
		const report = {
			users: 0,
			accounts: 0,
			sessions: 0,
			verifications: 0,
			geminiApiKeys: 0,
			personalAccessTokens: 0,
			importRuns: 0,
			importFiles: 0,
			likePages: 0,
			notifications: 0,
			segmentTypes: 0,
			pageLocaleTranslationProofs: 0,
			segmentMetadataTypes: 0,
			tags: 0,
			translationContexts: 0,
			pageViews: 0,
			segmentMetadata: 0,
			userSettings: 0,
			tagPages: 0,
			scriptures: 1,
			segments: 0,
			translations: 0,
			translationJobs: 0,
			translationVotes: 0,
			annotationLinks: 0,
		};
		const target: TursoConnection = {
			batch: vi.fn(async () => {}),
			all: vi.fn(async (sql) => {
				const table = /FROM ([a-z_]+)/.exec(sql)?.[1];
				const key =
					table === "translation_jobs"
						? "translationJobs"
						: (table?.replace(/_([a-z])/g, (_, letter: string) =>
								letter.toUpperCase(),
							) as keyof typeof report);
				return { rows: [{ count: report[key] ?? 0 }] };
			}),
		};

		const result = await runMigration({
			source,
			target,
			stdout: (line) => output.push(line),
		});

		expect(result.actualCounts).toEqual(report);
		expect(target.batch).toHaveBeenCalledTimes(1);
		expect(target.all).toHaveBeenCalledTimes(1);
		expect(output.map((line) => JSON.parse(line))).toEqual([
			expect.objectContaining({ mode: "apply" }),
			{ verified: report },
		]);
	});
});
