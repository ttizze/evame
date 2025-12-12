/*
目的: syncAnnotationLinksByParagraphNumber の「段落番号一致によるアノテーションリンク作成」と
「主要な例外ケース」を担保する。

方法: 実際のデータベースとDrizzle ORMを使用した統合テスト（古典派）。
*/

import { eq, inArray } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/drizzle";
import {
	contents,
	segmentAnnotationLinks,
	segmentMetadata,
	segmentMetadataTypes,
	segments,
} from "@/drizzle/schema";
import type { Page, Segment } from "@/drizzle/types";
import {
	getSegmentTypeId,
	resetDatabase,
	setupMasterData,
} from "@/tests/db-helpers";
import { createPageWithSegments, createUser } from "@/tests/factories";
import { setupDbPerFile } from "@/tests/test-db-manager";
import { syncAnnotationLinksByParagraphNumber } from "./index";

await setupDbPerFile(import.meta.url);
async function addParagraphNumbersToSegments(
	segmentParagraphPairs: Array<{ segmentId: number; paragraphNumber: string }>,
): Promise<void> {
	const [metadataType] = await db
		.select()
		.from(segmentMetadataTypes)
		.where(eq(segmentMetadataTypes.key, "PARAGRAPH_NUMBER"))
		.limit(1);
	if (!metadataType) {
		throw new Error("PARAGRAPH_NUMBER metadata type not found");
	}
	await db.insert(segmentMetadata).values(
		segmentParagraphPairs.map(({ segmentId, paragraphNumber }) => ({
			segmentId,
			metadataTypeId: metadataType.id,
			value: paragraphNumber,
		})),
	);
}

async function createAnnotationContentWithSegments(
	texts: string[],
): Promise<{ annotationContentId: number; annotationSegments: Segment[] }> {
	const [content] = await db
		.insert(contents)
		.values({ kind: "PAGE" })
		.returning();
	if (!content) {
		throw new Error("Failed to create content");
	}
	const commentaryTypeId = await getSegmentTypeId("COMMENTARY");

	const annotationSegments: Segment[] = [];
	for (let i = 0; i < texts.length; i++) {
		const [segment] = await db
			.insert(segments)
			.values({
				contentId: content.id,
				number: i,
				text: texts[i],
				textAndOccurrenceHash: `hash-ann-${i}`,
				segmentTypeId: commentaryTypeId,
			})
			.returning();
		if (!segment) {
			throw new Error(`Failed to create segment ${i}`);
		}
		annotationSegments.push(segment);
	}

	return { annotationContentId: content.id, annotationSegments };
}

async function createMainPageWithParagraphNumbers(
	paragraphNumbers: string[],
): Promise<{ mainPage: Page; mainSegments: Segment[] }> {
	const user = await createUser();
	const mainPage = (await createPageWithSegments({
		userId: user.id,
		slug: "main-page",
		segments: paragraphNumbers.map((_, i) => ({
			number: i,
			text: `Main segment ${i}`,
			textAndOccurrenceHash: `hash-main-${i}`,
			segmentTypeKey: "PRIMARY",
		})),
	})) as Page;
	const mainSegments = await db
		.select()
		.from(segments)
		.where(eq(segments.contentId, mainPage.id))
		.orderBy(segments.number);

	await addParagraphNumbersToSegments(
		mainSegments.map((seg, i) => ({
			segmentId: seg.id,
			paragraphNumber: paragraphNumbers[i] ?? "",
		})),
	);

	return { mainPage, mainSegments };
}

describe("syncAnnotationLinksByParagraphNumber", () => {
	beforeEach(async () => {
		await resetDatabase();
		await setupMasterData();
	});

	it("段落番号が一致する場合、アノテーションリンクが作成される", async () => {
		const { mainPage, mainSegments } = await createMainPageWithParagraphNumbers(
			["1", "2"],
		);
		const { annotationContentId, annotationSegments } =
			await createAnnotationContentWithSegments(["Ann 1", "Ann 2"]);

		const paragraphToAnnotationIds = new Map([
			["1", [annotationSegments[0].id]],
			["2", [annotationSegments[1].id]],
		]);

		await db.transaction(async (tx) =>
			syncAnnotationLinksByParagraphNumber(
				tx,
				annotationContentId,
				paragraphToAnnotationIds,
				mainPage.id,
			),
		);

		const links = await db
			.select()
			.from(segmentAnnotationLinks)
			.where(
				inArray(
					segmentAnnotationLinks.annotationSegmentId,
					annotationSegments.map((s) => s.id),
				),
			);
		expect(links).toHaveLength(2);
		expect(links).toContainEqual(
			expect.objectContaining({
				mainSegmentId: mainSegments[0].id,
				annotationSegmentId: annotationSegments[0].id,
			}),
		);
		expect(links).toContainEqual(
			expect.objectContaining({
				mainSegmentId: mainSegments[1].id,
				annotationSegmentId: annotationSegments[1].id,
			}),
		);
	});

	it("COMMENTARYタイプでない場合、リンクは作成されない", async () => {
		const { mainPage } = await createMainPageWithParagraphNumbers(["1"]);

		const [primaryContent] = await db
			.insert(contents)
			.values({ kind: "PAGE" })
			.returning();
		if (!primaryContent) {
			throw new Error("Failed to create content");
		}
		await db.insert(segments).values({
			contentId: primaryContent.id,
			number: 0,
			text: "Primary segment",
			textAndOccurrenceHash: "hash-primary",
			segmentTypeId: await getSegmentTypeId("PRIMARY"),
		});

		await db.transaction(async (tx) =>
			syncAnnotationLinksByParagraphNumber(
				tx,
				primaryContent.id,
				new Map([["1", [999]]]),
				mainPage.id,
			),
		);

		const links = await db
			.select()
			.from(segmentAnnotationLinks)
			.where(eq(segmentAnnotationLinks.annotationSegmentId, 999));
		expect(links).toHaveLength(0);
	});

	it("paragraphNumberToAnnotationSegmentIdsが空の場合、リンクは作成されない", async () => {
		const { mainPage } = await createMainPageWithParagraphNumbers(["1"]);
		const { annotationContentId, annotationSegments } =
			await createAnnotationContentWithSegments(["Ann"]);

		await db.transaction(async (tx) =>
			syncAnnotationLinksByParagraphNumber(
				tx,
				annotationContentId,
				new Map(),
				mainPage.id,
			),
		);

		const links = await db
			.select()
			.from(segmentAnnotationLinks)
			.where(
				eq(
					segmentAnnotationLinks.annotationSegmentId,
					annotationSegments[0].id,
				),
			);
		expect(links).toHaveLength(0);
	});

	it("anchorContentIdがない場合、リンクは作成されない", async () => {
		const { annotationContentId, annotationSegments } =
			await createAnnotationContentWithSegments(["Ann"]);

		await db.transaction(async (tx) =>
			syncAnnotationLinksByParagraphNumber(
				tx,
				annotationContentId,
				new Map([["1", [annotationSegments[0].id]]]),
				null,
			),
		);

		const links = await db
			.select()
			.from(segmentAnnotationLinks)
			.where(
				eq(
					segmentAnnotationLinks.annotationSegmentId,
					annotationSegments[0].id,
				),
			);
		expect(links).toHaveLength(0);
	});

	it("段落番号が一致しない場合、既存リンクは削除され新規リンクは作成されない", async () => {
		const { mainPage } = await createMainPageWithParagraphNumbers(["1"]);
		const { annotationContentId, annotationSegments } =
			await createAnnotationContentWithSegments(["Ann"]);

		// 既存リンクを作成
		const [extraMainSegment] = await db
			.insert(segments)
			.values({
				contentId: mainPage.id,
				number: 999,
				text: "Extra",
				textAndOccurrenceHash: "hash-extra",
				segmentTypeId: await getSegmentTypeId("PRIMARY"),
			})
			.returning();
		if (!extraMainSegment) {
			throw new Error("Failed to create segment");
		}
		await db.insert(segmentAnnotationLinks).values({
			mainSegmentId: extraMainSegment.id,
			annotationSegmentId: annotationSegments[0].id,
		});

		await db.transaction(async (tx) =>
			syncAnnotationLinksByParagraphNumber(
				tx,
				annotationContentId,
				new Map([["999", [annotationSegments[0].id]]]),
				mainPage.id,
			),
		);

		const links = await db
			.select()
			.from(segmentAnnotationLinks)
			.where(
				eq(
					segmentAnnotationLinks.annotationSegmentId,
					annotationSegments[0].id,
				),
			);
		expect(links).toHaveLength(0);
	});

	it("同じ段落番号に複数のアノテーションセグメントがある場合、すべてにリンクが作成される", async () => {
		const { mainPage, mainSegments } = await createMainPageWithParagraphNumbers(
			["1"],
		);
		const { annotationContentId, annotationSegments } =
			await createAnnotationContentWithSegments(["Ann 1", "Ann 2"]);

		const paragraphToAnnotationIds = new Map([
			["1", [annotationSegments[0].id, annotationSegments[1].id]],
		]);

		await db.transaction(async (tx) =>
			syncAnnotationLinksByParagraphNumber(
				tx,
				annotationContentId,
				paragraphToAnnotationIds,
				mainPage.id,
			),
		);

		const links = await db
			.select()
			.from(segmentAnnotationLinks)
			.where(
				inArray(
					segmentAnnotationLinks.annotationSegmentId,
					annotationSegments.map((s) => s.id),
				),
			);
		expect(links).toHaveLength(2);
		expect(links.every((l) => l.mainSegmentId === mainSegments[0].id)).toBe(
			true,
		);
	});

	it("同じ段落番号に複数のPRIMARYセグメントがある場合、最大numberのセグメントがアンカーになる", async () => {
		const { mainPage, mainSegments } = await createMainPageWithParagraphNumbers(
			["1", "1"],
		); // 両方同じ段落番号
		const { annotationContentId, annotationSegments } =
			await createAnnotationContentWithSegments(["Ann"]);

		await db.transaction(async (tx) =>
			syncAnnotationLinksByParagraphNumber(
				tx,
				annotationContentId,
				new Map([["1", [annotationSegments[0].id]]]),
				mainPage.id,
			),
		);

		const links = await db
			.select()
			.from(segmentAnnotationLinks)
			.where(
				eq(
					segmentAnnotationLinks.annotationSegmentId,
					annotationSegments[0].id,
				),
			);
		expect(links).toHaveLength(1);
		expect(links[0].mainSegmentId).toBe(mainSegments[1].id);
	});
});
