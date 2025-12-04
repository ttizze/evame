/*
目的: syncAnnotationLinksByParagraphNumber の「段落番号一致によるアノテーションリンク作成」と
「主要な例外ケース」を担保する。

方法: 実際のデータベースとPrisma Clientを使用した統合テスト（古典派）。
- テスト用のデータベースに実際にデータを書き込み、検証する
- トランザクションクライアントは実際のPrismaクライアントから取得
- セグメント、メタデータ、アノテーションリンクの作成とリンクを実際のDBで検証
*/

import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import {
	getSegmentTypeId,
	resetDatabase,
	setupMasterData,
} from "@/tests/db-helpers";
import { createPageWithSegments, createUser } from "@/tests/factories";
import { syncAnnotationLinksByParagraphNumber } from "./index";

describe("syncAnnotationLinksByParagraphNumber", () => {
	beforeEach(async () => {
		await resetDatabase();
		await setupMasterData();
	});

	it("COMMENTARYタイプのコンテンツで段落番号が一致する場合、アノテーションリンクが作成される", async () => {
		// Arrange: ユーザー、メインページ、アノテーションコンテンツを作成
		const user = await createUser();
		const mainPage = await createPageWithSegments({
			userId: user.id,
			slug: "main-page",
			segments: [
				{
					number: 0,
					text: "Main segment 1",
					textAndOccurrenceHash: "hash-main-1",
					segmentTypeKey: "PRIMARY",
				},
				{
					number: 1,
					text: "Main segment 2",
					textAndOccurrenceHash: "hash-main-2",
					segmentTypeKey: "PRIMARY",
				},
			],
		});

		// メインページのセグメントに段落番号メタデータを追加
		const mainSegments = await prisma.segment.findMany({
			where: { contentId: mainPage.id },
			orderBy: { number: "asc" },
		});

		const paragraphNumberMetadataType =
			await prisma.segmentMetadataType.findFirst({
				where: { key: "PARAGRAPH_NUMBER" },
			});
		if (!paragraphNumberMetadataType) {
			throw new Error("PARAGRAPH_NUMBER metadata type not found");
		}

		await prisma.segmentMetadata.createMany({
			data: [
				{
					segmentId: mainSegments[0]!.id,
					metadataTypeId: paragraphNumberMetadataType.id,
					value: "1",
				},
				{
					segmentId: mainSegments[1]!.id,
					metadataTypeId: paragraphNumberMetadataType.id,
					value: "2",
				},
			],
		});

		// アノテーションコンテンツを作成
		const annotationContent = await prisma.content.create({
			data: { kind: "PAGE" },
		});

		const commentarySegmentTypeId = await getSegmentTypeId("COMMENTARY");
		const annotationSegment1 = await prisma.segment.create({
			data: {
				contentId: annotationContent.id,
				number: 0,
				text: "Annotation for paragraph 1",
				textAndOccurrenceHash: "hash-ann-1",
				segmentTypeId: commentarySegmentTypeId,
			},
		});

		const annotationSegment2 = await prisma.segment.create({
			data: {
				contentId: annotationContent.id,
				number: 1,
				text: "Annotation for paragraph 2",
				textAndOccurrenceHash: "hash-ann-2",
				segmentTypeId: commentarySegmentTypeId,
			},
		});

		// 段落番号 → アノテーションセグメントIDのマッピング
		const paragraphNumberToAnnotationSegmentIds = new Map<string, number[]>([
			["1", [annotationSegment1.id]],
			["2", [annotationSegment2.id]],
		]);

		// Act: トランザクション内で関数を実行
		await prisma.$transaction(async (tx) => {
			await syncAnnotationLinksByParagraphNumber(
				tx,
				annotationContent.id,
				paragraphNumberToAnnotationSegmentIds,
				mainPage.id,
			);
		});

		// Assert: アノテーションリンクが正しく作成されている
		const links = await prisma.segmentAnnotationLink.findMany({
			where: {
				annotationSegmentId: {
					in: [annotationSegment1.id, annotationSegment2.id],
				},
			},
		});

		expect(links).toHaveLength(2);
		expect(
			links.some(
				(link) =>
					link.mainSegmentId === mainSegments[0]!.id &&
					link.annotationSegmentId === annotationSegment1.id,
			),
		).toBe(true);
		expect(
			links.some(
				(link) =>
					link.mainSegmentId === mainSegments[1]!.id &&
					link.annotationSegmentId === annotationSegment2.id,
			),
		).toBe(true);
	});

	it("COMMENTARYタイプでない場合は処理を終了し、リンクは作成されない", async () => {
		// Arrange: PRIMARYタイプのコンテンツを作成
		const user = await createUser();
		const mainPage = await createPageWithSegments({
			userId: user.id,
			slug: "main-page",
			segments: [
				{
					number: 0,
					text: "Main segment",
					textAndOccurrenceHash: "hash-main",
					segmentTypeKey: "PRIMARY",
				},
			],
		});

		const primaryContent = await prisma.content.create({
			data: { kind: "PAGE" },
		});

		const primarySegmentTypeId = await getSegmentTypeId("PRIMARY");
		await prisma.segment.create({
			data: {
				contentId: primaryContent.id,
				number: 0,
				text: "Primary segment",
				textAndOccurrenceHash: "hash-primary",
				segmentTypeId: primarySegmentTypeId,
			},
		});

		const paragraphNumberToAnnotationSegmentIds = new Map<string, number[]>([
			["1", [999]], // 存在しないセグメントID
		]);

		// Act: トランザクション内で関数を実行
		await prisma.$transaction(async (tx) => {
			await syncAnnotationLinksByParagraphNumber(
				tx,
				primaryContent.id,
				paragraphNumberToAnnotationSegmentIds,
				mainPage.id,
			);
		});

		// Assert: リンクは作成されていない
		const links = await prisma.segmentAnnotationLink.findMany({
			where: { annotationSegmentId: 999 },
		});

		expect(links).toHaveLength(0);
	});

	it("paragraphNumberToAnnotationSegmentIdsが空の場合は処理を終了し、リンクは作成されない", async () => {
		// Arrange: COMMENTARYタイプのコンテンツを作成
		const user = await createUser();
		const mainPage = await createPageWithSegments({
			userId: user.id,
			slug: "main-page",
			segments: [
				{
					number: 0,
					text: "Main segment",
					textAndOccurrenceHash: "hash-main",
					segmentTypeKey: "PRIMARY",
				},
			],
		});

		const annotationContent = await prisma.content.create({
			data: { kind: "PAGE" },
		});

		const commentarySegmentTypeId = await getSegmentTypeId("COMMENTARY");
		const annotationSegment = await prisma.segment.create({
			data: {
				contentId: annotationContent.id,
				number: 0,
				text: "Annotation segment",
				textAndOccurrenceHash: "hash-ann",
				segmentTypeId: commentarySegmentTypeId,
			},
		});

		const paragraphNumberToAnnotationSegmentIds = new Map<string, number[]>();

		// Act: トランザクション内で関数を実行
		await prisma.$transaction(async (tx) => {
			await syncAnnotationLinksByParagraphNumber(
				tx,
				annotationContent.id,
				paragraphNumberToAnnotationSegmentIds,
				mainPage.id,
			);
		});

		// Assert: リンクは作成されていない
		const links = await prisma.segmentAnnotationLink.findMany({
			where: { annotationSegmentId: annotationSegment.id },
		});

		expect(links).toHaveLength(0);
	});

	it("anchorContentIdがない場合は処理を終了し、リンクは作成されない", async () => {
		// Arrange: COMMENTARYタイプのコンテンツを作成
		const annotationContent = await prisma.content.create({
			data: { kind: "PAGE" },
		});

		const commentarySegmentTypeId = await getSegmentTypeId("COMMENTARY");
		const annotationSegment = await prisma.segment.create({
			data: {
				contentId: annotationContent.id,
				number: 0,
				text: "Annotation segment",
				textAndOccurrenceHash: "hash-ann",
				segmentTypeId: commentarySegmentTypeId,
			},
		});

		const paragraphNumberToAnnotationSegmentIds = new Map<string, number[]>([
			["1", [annotationSegment.id]],
		]);

		// Act: トランザクション内で関数を実行（anchorContentIdなし）
		await prisma.$transaction(async (tx) => {
			await syncAnnotationLinksByParagraphNumber(
				tx,
				annotationContent.id,
				paragraphNumberToAnnotationSegmentIds,
				undefined, // anchorContentIdなし
			);
		});

		// Assert: リンクは作成されていない
		const links = await prisma.segmentAnnotationLink.findMany({
			where: { annotationSegmentId: annotationSegment.id },
		});

		expect(links).toHaveLength(0);
	});

	it("段落番号が一致しない場合はリンクが作成されず、既存のリンクは削除される", async () => {
		// Arrange: ユーザー、メインページ、アノテーションコンテンツを作成
		const user = await createUser();
		const mainPage = await createPageWithSegments({
			userId: user.id,
			slug: "main-page",
			segments: [
				{
					number: 0,
					text: "Main segment",
					textAndOccurrenceHash: "hash-main",
					segmentTypeKey: "PRIMARY",
				},
			],
		});

		// メインページのセグメントに段落番号メタデータを追加（段落番号"1"）
		const mainSegments = await prisma.segment.findMany({
			where: { contentId: mainPage.id },
		});

		const paragraphNumberMetadataType =
			await prisma.segmentMetadataType.findFirst({
				where: { key: "PARAGRAPH_NUMBER" },
			});
		if (!paragraphNumberMetadataType) {
			throw new Error("PARAGRAPH_NUMBER metadata type not found");
		}

		await prisma.segmentMetadata.create({
			data: {
				segmentId: mainSegments[0]!.id,
				metadataTypeId: paragraphNumberMetadataType.id,
				value: "1",
			},
		});

		// アノテーションコンテンツを作成
		const annotationContent = await prisma.content.create({
			data: { kind: "PAGE" },
		});

		const commentarySegmentTypeId = await getSegmentTypeId("COMMENTARY");
		const annotationSegment = await prisma.segment.create({
			data: {
				contentId: annotationContent.id,
				number: 0,
				text: "Annotation segment",
				textAndOccurrenceHash: "hash-ann",
				segmentTypeId: commentarySegmentTypeId,
			},
		});

		// 既存のリンクを作成（別のメインセグメントにリンク）
		const existingMainSegment = await prisma.segment.create({
			data: {
				contentId: mainPage.id,
				number: 999,
				text: "Existing main segment",
				textAndOccurrenceHash: "hash-existing",
				segmentTypeId: await getSegmentTypeId("PRIMARY"),
			},
		});

		await prisma.segmentAnnotationLink.create({
			data: {
				mainSegmentId: existingMainSegment.id,
				annotationSegmentId: annotationSegment.id,
			},
		});

		// 段落番号 → アノテーションセグメントIDのマッピング（一致しない段落番号"999"）
		const paragraphNumberToAnnotationSegmentIds = new Map<string, number[]>([
			["999", [annotationSegment.id]], // メインページには段落番号"999"のセグメントがない
		]);

		// Act: トランザクション内で関数を実行
		await prisma.$transaction(async (tx) => {
			await syncAnnotationLinksByParagraphNumber(
				tx,
				annotationContent.id,
				paragraphNumberToAnnotationSegmentIds,
				mainPage.id,
			);
		});

		// Assert: 既存のリンクは削除され、新しいリンクは作成されていない
		const links = await prisma.segmentAnnotationLink.findMany({
			where: { annotationSegmentId: annotationSegment.id },
		});

		expect(links).toHaveLength(0);
	});

	it("同じ段落番号に複数のアノテーションセグメントがある場合、すべてのセグメントにリンクが作成される", async () => {
		// Arrange: ユーザー、メインページ、アノテーションコンテンツを作成
		const user = await createUser();
		const mainPage = await createPageWithSegments({
			userId: user.id,
			slug: "main-page",
			segments: [
				{
					number: 0,
					text: "Main segment",
					textAndOccurrenceHash: "hash-main",
					segmentTypeKey: "PRIMARY",
				},
			],
		});

		// メインページのセグメントに段落番号メタデータを追加
		const mainSegments = await prisma.segment.findMany({
			where: { contentId: mainPage.id },
		});

		const paragraphNumberMetadataType =
			await prisma.segmentMetadataType.findFirst({
				where: { key: "PARAGRAPH_NUMBER" },
			});
		if (!paragraphNumberMetadataType) {
			throw new Error("PARAGRAPH_NUMBER metadata type not found");
		}

		await prisma.segmentMetadata.create({
			data: {
				segmentId: mainSegments[0]!.id,
				metadataTypeId: paragraphNumberMetadataType.id,
				value: "1",
			},
		});

		// アノテーションコンテンツを作成
		const annotationContent = await prisma.content.create({
			data: { kind: "PAGE" },
		});

		const commentarySegmentTypeId = await getSegmentTypeId("COMMENTARY");
		const annotationSegment1 = await prisma.segment.create({
			data: {
				contentId: annotationContent.id,
				number: 0,
				text: "Annotation segment 1",
				textAndOccurrenceHash: "hash-ann-1",
				segmentTypeId: commentarySegmentTypeId,
			},
		});

		const annotationSegment2 = await prisma.segment.create({
			data: {
				contentId: annotationContent.id,
				number: 1,
				text: "Annotation segment 2",
				textAndOccurrenceHash: "hash-ann-2",
				segmentTypeId: commentarySegmentTypeId,
			},
		});

		// 同じ段落番号に複数のアノテーションセグメントをマッピング
		const paragraphNumberToAnnotationSegmentIds = new Map<string, number[]>([
			["1", [annotationSegment1.id, annotationSegment2.id]],
		]);

		// Act: トランザクション内で関数を実行
		await prisma.$transaction(async (tx) => {
			await syncAnnotationLinksByParagraphNumber(
				tx,
				annotationContent.id,
				paragraphNumberToAnnotationSegmentIds,
				mainPage.id,
			);
		});

		// Assert: 両方のアノテーションセグメントにリンクが作成されている
		const links = await prisma.segmentAnnotationLink.findMany({
			where: {
				annotationSegmentId: {
					in: [annotationSegment1.id, annotationSegment2.id],
				},
			},
		});

		expect(links).toHaveLength(2);
		expect(
			links.every((link) => link.mainSegmentId === mainSegments[0]!.id),
		).toBe(true);
		expect(
			links.some((link) => link.annotationSegmentId === annotationSegment1.id),
		).toBe(true);
		expect(
			links.some((link) => link.annotationSegmentId === annotationSegment2.id),
		).toBe(true);
	});

	it("同じ段落番号に複数のPRIMARYセグメントがある場合、最大numberのセグメントがアンカーとして選択される", async () => {
		// Arrange: ユーザー、メインページ、アノテーションコンテンツを作成
		const user = await createUser();
		const mainPage = await createPageWithSegments({
			userId: user.id,
			slug: "main-page",
			segments: [
				{
					number: 0,
					text: "Main segment 1",
					textAndOccurrenceHash: "hash-main-1",
					segmentTypeKey: "PRIMARY",
				},
				{
					number: 1,
					text: "Main segment 2",
					textAndOccurrenceHash: "hash-main-2",
					segmentTypeKey: "PRIMARY",
				},
			],
		});

		// 両方のセグメントに同じ段落番号"1"のメタデータを追加
		const mainSegments = await prisma.segment.findMany({
			where: { contentId: mainPage.id },
			orderBy: { number: "asc" },
		});

		const paragraphNumberMetadataType =
			await prisma.segmentMetadataType.findFirst({
				where: { key: "PARAGRAPH_NUMBER" },
			});
		if (!paragraphNumberMetadataType) {
			throw new Error("PARAGRAPH_NUMBER metadata type not found");
		}

		await prisma.segmentMetadata.createMany({
			data: [
				{
					segmentId: mainSegments[0]!.id,
					metadataTypeId: paragraphNumberMetadataType.id,
					value: "1",
				},
				{
					segmentId: mainSegments[1]!.id,
					metadataTypeId: paragraphNumberMetadataType.id,
					value: "1",
				},
			],
		});

		// アノテーションコンテンツを作成
		const annotationContent = await prisma.content.create({
			data: { kind: "PAGE" },
		});

		const commentarySegmentTypeId = await getSegmentTypeId("COMMENTARY");
		const annotationSegment = await prisma.segment.create({
			data: {
				contentId: annotationContent.id,
				number: 0,
				text: "Annotation segment",
				textAndOccurrenceHash: "hash-ann",
				segmentTypeId: commentarySegmentTypeId,
			},
		});

		// 段落番号 → アノテーションセグメントIDのマッピング
		const paragraphNumberToAnnotationSegmentIds = new Map<string, number[]>([
			["1", [annotationSegment.id]],
		]);

		// Act: トランザクション内で関数を実行
		await prisma.$transaction(async (tx) => {
			await syncAnnotationLinksByParagraphNumber(
				tx,
				annotationContent.id,
				paragraphNumberToAnnotationSegmentIds,
				mainPage.id,
			);
		});

		// Assert: 最大number（1）のセグメントにリンクが作成されている
		const links = await prisma.segmentAnnotationLink.findMany({
			where: { annotationSegmentId: annotationSegment.id },
		});

		expect(links).toHaveLength(1);
		expect(links[0]!.mainSegmentId).toBe(mainSegments[1]!.id); // number: 1のセグメント
	});
});
