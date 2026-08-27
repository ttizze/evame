import { describe, expect, it } from "vitest";
import { buildMigrationPlan } from "./plan";
import type { SourceSnapshot } from "./types";

function makeSnapshot(): SourceSnapshot {
	return {
		pages: [
			{
				id: 1,
				contentKind: "PAGE",
				slug: "tipitaka",
				title: "Tipiṭaka",
				sourceLocale: "pi",
				parentId: null,
				position: 0,
				status: "ARCHIVE",
				publishedAt: "2025-01-01T00:00:00.000Z",
				createdAt: "2025-01-01T00:00:00.000Z",
			},
			{
				id: 2,
				contentKind: "PAGE",
				slug: "tipitaka-01-sutta",
				title: "Sutta Piṭaka",
				sourceLocale: "pi",
				parentId: 1,
				position: 1,
				status: "ARCHIVE",
				publishedAt: "2025-01-01T00:00:00.000Z",
				createdAt: "2025-01-01T00:00:00.000Z",
			},
			{
				id: 3,
				contentKind: "PAGE",
				slug: "tipitaka-draft",
				title: "Draft",
				sourceLocale: "pi",
				parentId: 1,
				position: 2,
				status: "DRAFT",
				publishedAt: null,
				createdAt: "2025-01-01T00:00:00.000Z",
			},
			{
				id: 4,
				contentKind: "PAGE",
				slug: "outside",
				title: "Outside",
				sourceLocale: "en",
				parentId: null,
				position: 0,
				status: "PUBLIC",
				publishedAt: "2025-01-01T00:00:00.000Z",
				createdAt: "2025-01-01T00:00:00.000Z",
			},
			{
				id: 5,
				contentKind: "PAGE_COMMENT",
				slug: "comment",
				title: "Comment",
				sourceLocale: "en",
				parentId: 2,
				position: 0,
				status: "PUBLIC",
				publishedAt: "2025-01-01T00:00:00.000Z",
				createdAt: "2025-01-01T00:00:00.000Z",
			},
		],
		segments: [
			{
				id: 10,
				contentId: 2,
				segmentTypeId: 1,
				position: 0,
				kind: "PRIMARY",
				sourceText: "Sutta Piṭaka",
				textAndOccurrenceHash: "hash-10",
				createdAt: "2025-01-01T00:00:00.000Z",
			},
			{
				id: 11,
				contentId: 2,
				segmentTypeId: 2,
				position: 1,
				kind: "COMMENTARY",
				sourceText: "Commentary text",
				textAndOccurrenceHash: "hash-11",
				createdAt: "2025-01-01T00:00:00.000Z",
			},
			{
				id: 12,
				contentId: 5,
				segmentTypeId: 1,
				position: 1,
				kind: "PRIMARY",
				sourceText: "Comment text",
				textAndOccurrenceHash: "hash-12",
				createdAt: "2025-01-01T00:00:00.000Z",
			},
			{
				id: 13,
				contentId: 2,
				segmentTypeId: 3,
				position: 2,
				kind: "OTHER",
				sourceText: "Unsupported type",
				textAndOccurrenceHash: "hash-13",
				createdAt: "2025-01-01T00:00:00.000Z",
			},
		],
		translations: [
			{
				id: 100,
				segmentId: 11,
				locale: "ja",
				text: "注釈",
				point: 3,
				userId: "voter-1",
				createdAt: "2025-01-02T00:00:00.000Z",
			},
			{
				id: 101,
				segmentId: 12,
				locale: "ja",
				text: "コメント訳",
				point: 99,
				userId: "voter-1",
				createdAt: "2025-01-02T00:00:00.000Z",
			},
			{
				id: 102,
				segmentId: 13,
				locale: "ja",
				text: "未対応訳",
				point: 99,
				userId: "voter-1",
				createdAt: "2025-01-02T00:00:00.000Z",
			},
		],
		users: [
			{
				id: "voter-1",
				email: "voter@example.com",
				name: "Voter",
				handle: "voter-one",
				profile: "Voter profile",
				totalPoints: 12,
				isAi: false,
				image: "https://example.com/voter.png",
				plan: "free",
				provider: "Credentials",
				twitterHandle: "@voter-one",
				emailVerified: true,
				createdAt: "2025-01-01T00:00:00.000Z",
				updatedAt: "2025-01-02T00:00:00.000Z",
			},
			{
				id: "unused",
				email: "unused@example.com",
				name: "Unused",
				handle: "unused-user",
				profile: "Unused profile",
				totalPoints: 0,
				isAi: false,
				image: "https://example.com/unused.png",
				plan: "free",
				provider: "Credentials",
				twitterHandle: "",
				emailVerified: null,
				createdAt: "2025-01-01T00:00:00.000Z",
				updatedAt: "2025-01-01T00:00:00.000Z",
			},
		],
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
		votes: [
			{
				translationId: 100,
				userId: "voter-1",
				isUpvote: true,
				createdAt: "2025-01-03T00:00:00.000Z",
				updatedAt: "2025-01-03T00:00:00.000Z",
			},
			{
				translationId: 101,
				userId: "voter-1",
				isUpvote: true,
				createdAt: "2025-01-03T00:00:00.000Z",
				updatedAt: "2025-01-03T00:00:00.000Z",
			},
			{
				translationId: 100,
				userId: "missing-user",
				isUpvote: false,
				createdAt: "2025-01-03T00:00:00.000Z",
				updatedAt: "2025-01-03T00:00:00.000Z",
			},
		],
		translationJobs: [],
		annotationLinks: [
			{
				mainSegmentId: 10,
				annotationSegmentId: 11,
				createdAt: "2025-01-04T00:00:00.000Z",
			},
			{
				mainSegmentId: 11,
				annotationSegmentId: 12,
				createdAt: "2025-01-04T00:00:00.000Z",
			},
		],
	};
}

describe("buildMigrationPlan", () => {
	it("ARCHIVEかつpiのTipitaka PAGEだけを残し、コメント由来行とOTHERを除外する", () => {
		const plan = buildMigrationPlan(makeSnapshot());

		expect(plan.scriptures.map((row) => row.id)).toEqual([1, 2]);
		expect(plan.segments.map((row) => row.id)).toEqual([10, 11]);
		expect(plan.translations.map((row) => row.id)).toEqual([100]);
		expect(plan.translations).toEqual([
			{
				id: 100,
				segmentId: 11,
				locale: "ja",
				text: "注釈",
				point: 3,
				userId: "voter-1",
				source: "USER",
				aiJobId: null,
				createdAt: "2025-01-02T00:00:00.000Z",
				updatedAt: "2025-01-02T00:00:00.000Z",
			},
		]);
		expect(plan.translationVotes).toEqual([
			{
				translationId: 100,
				userId: "voter-1",
				isUpvote: true,
				createdAt: "2025-01-03T00:00:00.000Z",
				updatedAt: "2025-01-03T00:00:00.000Z",
			},
		]);
		expect(plan.users.map((row) => row.id)).toEqual(["unused", "voter-1"]);
		expect(plan.annotationLinks).toEqual([
			{
				mainSegmentId: 10,
				annotationSegmentId: 11,
				createdAt: "2025-01-04T00:00:00.000Z",
			},
		]);
	});

	it("件数と除外理由を照合可能な形で返す", () => {
		const report = buildMigrationPlan(makeSnapshot()).report;

		expect(report.counts).toEqual({
			users: 2,
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
			scriptures: 2,
			segments: 2,
			translations: 1,
			translationJobs: 0,
			translationVotes: 1,
			annotationLinks: 1,
		});
		expect(report.skipped).toMatchObject({
			pages: 3,
			segments: 2,
			translations: 2,
			translationJobs: 0,
			translationVotes: 2,
			users: 0,
			annotationLinks: 1,
		});
	});

	it("ARCHIVEかつpiのrootがない場合は空計画にする", () => {
		const snapshot = makeSnapshot();
		snapshot.pages = snapshot.pages.filter((page) => page.slug !== "tipitaka");

		const plan = buildMigrationPlan(snapshot);

		expect(plan.scriptures).toEqual([]);
		expect(plan.segments).toEqual([]);
		expect(plan.translations).toEqual([]);
		expect(plan.translationVotes).toEqual([]);
		expect(plan.users.map((user) => user.id)).toEqual(["unused", "voter-1"]);
	});

	it("ARCHIVEかつpiのTipitaka root木だけを選び、PUBLIC記事を除外する", () => {
		const snapshot = makeSnapshot();
		snapshot.pages[0]!.status = "ARCHIVE";
		snapshot.pages[0]!.sourceLocale = "pi";
		snapshot.pages[0]!.publishedAt = null;
		snapshot.pages[1]!.status = "ARCHIVE";
		snapshot.pages[1]!.sourceLocale = "pi";
		snapshot.pages.push({
			id: 6,
			contentKind: "PAGE",
			slug: "public-article",
			title: "Public article",
			sourceLocale: "pi",
			parentId: null,
			position: 3,
			status: "PUBLIC",
			publishedAt: "2025-01-01T00:00:00.000Z",
			createdAt: "2025-01-01T00:00:00.000Z",
		});
		snapshot.pages.push({
			id: 7,
			contentKind: "PAGE",
			slug: "tipitaka-en-branch",
			title: "English branch",
			sourceLocale: "en",
			parentId: 1,
			position: 4,
			status: "ARCHIVE",
			publishedAt: "2025-01-01T00:00:00.000Z",
			createdAt: "2025-01-01T00:00:00.000Z",
		});

		const plan = buildMigrationPlan(snapshot);

		expect(plan.scriptures.map((scripture) => scripture.id)).toEqual([1, 2]);
		expect(plan.scriptures[0]?.publishedAt).toBeNull();
		expect(plan.scriptures.some((scripture) => scripture.id === 6)).toBe(false);
		expect(plan.scriptures.some((scripture) => scripture.id === 7)).toBe(false);
		expect(plan.segments.map((segment) => segment.id)).toEqual([10, 11]);
	});

	it("指定したARCHIVEかつpiのroot slugから木を選び、空計画にしない", () => {
		const snapshot = makeSnapshot();
		snapshot.pages[0]!.slug = "sutta-root";

		const plan = buildMigrationPlan(snapshot, "sutta-root");

		expect(plan.scriptures.map((scripture) => scripture.id)).toEqual([1, 2]);
		expect(plan.segments.map((segment) => segment.id)).toEqual([10, 11]);
	});

	it("記事と無関係なユーザーのBetter AuthとGemini keyを関係付きで保持する", () => {
		const snapshot = makeSnapshot();
		snapshot.accounts = [
			{
				id: "account-1",
				userId: "unused",
				providerId: "credentials",
				accountId: "unused@example.com",
				refreshToken: "ciphertext-refresh",
				accessToken: null,
				scope: null,
				idToken: null,
				password: null,
				refreshTokenExpiresAt: null,
				accessTokenExpiresAt: null,
				createdAt: "2025-01-01T00:00:00.000Z",
				updatedAt: "2025-01-02T00:00:00.000Z",
			},
		];
		snapshot.sessions = [
			{
				id: "session-1",
				token: "session-token",
				userId: "unused",
				expiresAt: "2025-02-01T00:00:00.000Z",
				ipAddress: null,
				userAgent: "test-agent",
				createdAt: "2025-01-01T00:00:00.000Z",
				updatedAt: "2025-01-02T00:00:00.000Z",
			},
		];
		snapshot.verifications = [
			{
				id: "verification-1",
				identifier: "unused@example.com",
				value: "verification-value",
				expiresAt: "2025-02-01T00:00:00.000Z",
				createdAt: null,
				updatedAt: null,
			},
		];
		snapshot.geminiApiKeys = [
			{ id: 1, userId: "unused", apiKey: "ciphertext-gemini" },
		];

		const plan = buildMigrationPlan(snapshot);

		expect(plan.accounts).toMatchObject([
			{ id: "account-1", userId: "unused" },
		]);
		expect(plan.sessions).toMatchObject([
			{ id: "session-1", userId: "unused" },
		]);
		expect(plan.verifications).toMatchObject([{ id: "verification-1" }]);
		expect(plan.geminiApiKeys).toEqual([
			{ id: 1, userId: "unused", apiKey: "ciphertext-gemini" },
		]);
	});

	it("scripture所有者とAI翻訳の対応を残し、未完了jobをFAILEDへ正規化する", () => {
		const snapshot = makeSnapshot();
		snapshot.pages[0]!.ownerUserId = "voter-1";
		snapshot.pages[1]!.ownerUserId = "voter-1";
		snapshot.users.push({
			id: "ai-1",
			email: "ai@example.com",
			name: "AI Translator",
			handle: "ai-translator",
			profile: "AI",
			totalPoints: 0,
			isAi: true,
			image: "https://example.com/ai.png",
			plan: "free",
			provider: "Credentials",
			twitterHandle: "",
			emailVerified: null,
			createdAt: "2025-01-01T00:00:00.000Z",
			updatedAt: "2025-01-01T00:00:00.000Z",
		});
		snapshot.translations.push({
			id: 103,
			segmentId: 10,
			locale: "ja",
			text: "三蔵",
			point: 1,
			userId: "ai-1",
			createdAt: "2025-01-02T00:00:00.000Z",
		});
		snapshot.translationJobs = [
			{
				id: 55,
				pageId: 2,
				locale: "ja",
				model: "model",
				status: "IN_PROGRESS",
				progress: 1,
				error: "",
				translationContext: "既存用語を優先する",
				requestedBy: "voter-1",
				createdAt: "2025-01-02T00:00:00.000Z",
				updatedAt: "2025-01-02T00:00:00.000Z",
			},
			{
				id: 56,
				pageId: 2,
				locale: "en",
				model: "model",
				status: "COMPLETED",
				progress: 2,
				error: "",
				requestedBy: null,
				createdAt: "2025-01-02T00:00:00.000Z",
				updatedAt: "2025-01-02T00:00:00.000Z",
			},
		];

		const plan = buildMigrationPlan(snapshot);

		expect(
			plan.scriptures.every((scripture) => scripture.ownerUserId === "voter-1"),
		).toBe(true);
		expect(plan.users.map((user) => user.id).sort()).toEqual([
			"ai-1",
			"unused",
			"voter-1",
		]);
		expect(
			plan.translations.find((translation) => translation.id === 103),
		).toMatchObject({
			source: "AI",
			aiJobId: "55",
		});
		expect(plan.translationJobs).toMatchObject([
			{
				id: "55",
				status: "FAILED",
				total: 2,
				error: "Migrated incomplete translation job; rerun required.",
				translationContext: "既存用語を優先する",
			},
			{
				id: "56",
				status: "COMPLETED",
				requestedBy: null,
				translationContext: "",
			},
		]);
	});

	it("新schemaの非空制約に反する翻訳を対象件数から除外する", () => {
		const snapshot = makeSnapshot();
		snapshot.translations.push({
			id: 104,
			segmentId: 10,
			locale: "ja",
			text: "   ",
			point: 0,
			userId: "voter-1",
			createdAt: "2025-01-02T00:00:00.000Z",
		});

		const plan = buildMigrationPlan(snapshot);

		expect(
			plan.translations.some((translation) => translation.id === 104),
		).toBe(false);
		expect(plan.report.skipped.translations).toBe(3);
	});

	it("非記事のglobal表を全件保持し、Tipitaka従属表だけをARCHIVE + pi PAGEで絞る", () => {
		const snapshot = makeSnapshot();
		snapshot.pages[1]!.importFileId = 10;
		snapshot.importRuns = [
			{
				id: 20,
				startedAt: "2025-01-01T00:00:00.000Z",
				finishedAt: "2025-01-01T01:00:00.000Z",
				status: "COMPLETED",
			},
			{
				id: 21,
				startedAt: "2025-01-02T00:00:00.000Z",
				finishedAt: null,
				status: "RUNNING",
			},
		];
		snapshot.importFiles = [
			{
				id: 10,
				importRunId: 20,
				path: "tipitaka.json",
				checksum: "checksum-10",
				status: "COMPLETED",
				message: "",
				createdAt: "2025-01-01T00:00:00.000Z",
			},
			{
				id: 11,
				importRunId: 21,
				path: "article.json",
				checksum: "checksum-11",
				status: "COMPLETED",
				message: "",
				createdAt: "2025-01-02T00:00:00.000Z",
			},
		];
		snapshot.personalAccessTokens = [
			{
				id: 1,
				keyHash: "hash-token",
				userId: "unused",
				name: "CLI",
				createdAt: "2025-01-01T00:00:00.000Z",
				lastUsedAt: null,
			},
		];
		snapshot.notifications = [
			{
				id: 1,
				userId: "unused",
				type: "PAGE_COMMENT",
				read: false,
				createdAt: "2025-01-01T00:00:00.000Z",
				actorId: "voter-1",
				pageCommentId: 999,
				pageId: 999,
				segmentTranslationId: 999,
			},
		];
		snapshot.segmentTypes = [
			{ id: 1, label: "本文", key: "PRIMARY" },
			{ id: 2, label: "注釈", key: "COMMENTARY" },
		];
		snapshot.segmentMetadataTypes = [
			{ id: 1, key: "edition", label: "Edition" },
		];
		snapshot.tags = [{ id: 1, name: "sutta" }];
		snapshot.translationContexts = [
			{
				id: 1,
				userId: "unused",
				name: "context",
				context: "preserve",
				createdAt: "2025-01-01T00:00:00.000Z",
				updatedAt: "2025-01-01T00:00:00.000Z",
			},
		];
		snapshot.userSettings = [
			{
				id: 1,
				userId: "unused",
				targetLocales: ["ja", "en"],
				createdAt: "2025-01-01T00:00:00.000Z",
				updatedAt: "2025-01-01T00:00:00.000Z",
			},
		];
		snapshot.likePages = [
			{
				id: 1,
				pageId: 2,
				createdAt: "2025-01-01T00:00:00.000Z",
				userId: "unused",
			},
			{
				id: 2,
				pageId: 4,
				createdAt: "2025-01-01T00:00:00.000Z",
				userId: "unused",
			},
		];
		snapshot.pageLocaleTranslationProofs = [
			{ id: 1, pageId: 2, locale: "ja", translationProofStatus: "PROOFREAD" },
			{ id: 2, pageId: 4, locale: "ja", translationProofStatus: "PROOFREAD" },
		];
		snapshot.pageViews = [
			{ pageId: 2, count: 12 },
			{ pageId: 4, count: 99 },
		];
		snapshot.segmentMetadata = [
			{
				id: 1,
				segmentId: 10,
				metadataTypeId: 1,
				value: "PTS",
				createdAt: "2025-01-01T00:00:00.000Z",
			},
		];
		snapshot.tagPages = [{ tagId: 1, pageId: 2 }];

		const plan = buildMigrationPlan(snapshot);

		expect(plan.personalAccessTokens).toHaveLength(1);
		expect(plan.notifications).toHaveLength(1);
		expect(plan.importRuns.map((row) => row.id)).toEqual([20]);
		expect(plan.importFiles.map((row) => row.id)).toEqual([10]);
		expect(plan.likePages.map((row) => row.pageId)).toEqual([2]);
		expect(plan.pageLocaleTranslationProofs.map((row) => row.pageId)).toEqual([
			2,
		]);
		expect(plan.pageViews).toEqual([{ pageId: 2, count: 12 }]);
		expect(plan.segmentMetadata).toHaveLength(1);
		expect(plan.tagPages).toEqual([{ tagId: 1, pageId: 2 }]);
		expect(plan.userSettings[0]?.targetLocales).toBe('["ja","en"]');
		expect(plan.report.skipped.importRuns).toBe(1);
		expect(plan.report.skipped.importFiles).toBe(1);
		expect(plan.report.skipped.likePages).toBe(1);
	});
});
