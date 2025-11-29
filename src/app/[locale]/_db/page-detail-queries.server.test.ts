import { resetDatabase, setupMasterData } from "@/tests/db-helpers";
import { createPageWithAnnotations, createUser } from "@/tests/factories";
import { beforeEach, describe, expect, it } from "vitest";
import { fetchPageDetail } from "./page-detail-queries.server";

describe("fetchPageDetail 注釈取得のテスト", () => {
	beforeEach(async () => {
		// テストごとに必ず: データベースをリセット
		await resetDatabase();
		// マスターデータをセットアップ（SegmentTypeなど）
		await setupMasterData();
	});

	it("annotationsから取得されるセグメントは注釈（COMMENTARY）のみである", async () => {
		// 必要なときだけ呼ぶ: テストデータを作成
		const testUser = await createUser();
		const { mainPage } = await createPageWithAnnotations({
			userId: testUser.id,
			mainPageSlug: "main-page",
			mainPageSegments: [
				{
					number: 0,
					text: "Main Page Title",
					textAndOccurrenceHash: "hash-title",
				},
				{ number: 1, text: "First paragraph", textAndOccurrenceHash: "hash-1" },
				{
					number: 2,
					text: "Second paragraph",
					textAndOccurrenceHash: "hash-2",
				},
			],
			annotationSegments: [
				{
					number: 1,
					text: "Annotation for paragraph 1",
					textAndOccurrenceHash: "hash-ann-1",
					linkedToMainSegmentNumber: 1,
				},
				{
					number: 2,
					text: "Annotation for paragraph 2",
					textAndOccurrenceHash: "hash-ann-2",
					linkedToMainSegmentNumber: 2,
				},
			],
		});

		const result = await fetchPageDetail(mainPage.slug, "en");

		expect(result).not.toBeNull();
		expect(result?.content.segments).toBeDefined();

		// 本文セグメント（number: 1）のannotationsを確認
		const segment1 = result?.content.segments.find((s) => s.number === 1);
		expect(segment1).toBeDefined();
		expect(segment1?.annotations).toBeDefined();
		expect(segment1?.annotations?.length).toBeGreaterThan(0);

		// すべてのセグメントがCOMMENTARYであることを確認
		const annotationSegments = segment1?.annotations || [];
		expect(annotationSegments.length).toBeGreaterThan(0);

		for (const annotationSegment of annotationSegments) {
			// annotationSegmentはpickBestTranslationの結果で、segmentTypeを直接持つ
			const segment = annotationSegment as unknown as {
				segmentType: { key: string };
			};
			expect(segment.segmentType.key).toBe("COMMENTARY");
			expect(segment.segmentType.key).not.toBe("PRIMARY");
		}
	});

	it("本文セグメント（PRIMARY）はannotationsの中に含まれない", async () => {
		// 必要なときだけ呼ぶ: テストデータを作成
		const testUser = await createUser();
		const { mainPage } = await createPageWithAnnotations({
			userId: testUser.id,
			mainPageSlug: "main-page",
			mainPageSegments: [
				{
					number: 0,
					text: "Main Page Title",
					textAndOccurrenceHash: "hash-title",
				},
				{ number: 1, text: "First paragraph", textAndOccurrenceHash: "hash-1" },
				{
					number: 2,
					text: "Second paragraph",
					textAndOccurrenceHash: "hash-2",
				},
			],
			annotationSegments: [
				{
					number: 1,
					text: "Annotation for paragraph 1",
					textAndOccurrenceHash: "hash-ann-1",
					linkedToMainSegmentNumber: 1,
				},
			],
		});

		const result = await fetchPageDetail(mainPage.slug, "en");

		expect(result).not.toBeNull();

		// すべてのannotationsを確認
		for (const segment of result?.content.segments || []) {
			if (segment.annotations) {
				for (const annotationSegment of segment.annotations) {
					const segment = annotationSegment as unknown as {
						segmentType: { key: string };
					};
					expect(segment.segmentType.key).not.toBe("PRIMARY");
					expect(segment.segmentType.key).toBe("COMMENTARY");
				}
			}
		}
	});
});
