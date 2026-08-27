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
				status: "PUBLIC",
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
				status: "PUBLIC",
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
				position: 0,
				kind: "PRIMARY",
				sourceText: "Sutta Piṭaka",
				createdAt: "2025-01-01T00:00:00.000Z",
			},
			{
				id: 11,
				contentId: 2,
				position: 1,
				kind: "COMMENTARY",
				sourceText: "Commentary text",
				createdAt: "2025-01-01T00:00:00.000Z",
			},
			{
				id: 12,
				contentId: 5,
				position: 1,
				kind: "PRIMARY",
				sourceText: "Comment text",
				createdAt: "2025-01-01T00:00:00.000Z",
			},
			{
				id: 13,
				contentId: 2,
				position: 2,
				kind: "OTHER",
				sourceText: "Unsupported type",
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
				isAi: false,
				createdAt: "2025-01-01T00:00:00.000Z",
			},
			{
				id: "unused",
				email: "unused@example.com",
				name: "Unused",
				isAi: false,
				createdAt: "2025-01-01T00:00:00.000Z",
			},
		],
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
	it("PUBLICなTipitaka PAGEだけを残し、コメント由来行とOTHERを除外する", () => {
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
		expect(plan.users.map((row) => row.id)).toEqual(["voter-1"]);
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
			users: 1,
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
			users: 1,
			annotationLinks: 1,
		});
	});

	it("公開ルートがない場合は空計画にする", () => {
		const snapshot = makeSnapshot();
		snapshot.pages = snapshot.pages.filter((page) => page.slug !== "tipitaka");

		const plan = buildMigrationPlan(snapshot);

		expect(plan.scriptures).toEqual([]);
		expect(plan.segments).toEqual([]);
		expect(plan.translations).toEqual([]);
		expect(plan.translationVotes).toEqual([]);
		expect(plan.users).toEqual([]);
	});

	it("scripture所有者とAI翻訳の対応を残し、未完了jobをFAILEDへ正規化する", () => {
		const snapshot = makeSnapshot();
		snapshot.pages[0]!.ownerUserId = "voter-1";
		snapshot.pages[1]!.ownerUserId = "voter-1";
		snapshot.users.push({
			id: "ai-1",
			email: "ai@example.com",
			name: "AI Translator",
			isAi: true,
			createdAt: "2025-01-01T00:00:00.000Z",
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
			},
			{ id: "56", status: "COMPLETED", requestedBy: null },
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
});
