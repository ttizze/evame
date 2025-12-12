import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/drizzle";
import { segments } from "@/drizzle/schema";
import { resetDatabase } from "@/tests/db-helpers";
import {
	createPage,
	createPageWithSegments,
	createUser,
} from "@/tests/factories";
import { setupDbPerFile } from "@/tests/test-db-manager";
import { syncSegments } from "./index";

await setupDbPerFile(import.meta.url);

describe("syncSegments", () => {
	beforeEach(async () => {
		await resetDatabase();
	});

	it("新規セグメントを作成する", async () => {
		// Arrange
		const user = await createUser();
		const page = await createPage({ userId: user.id, slug: "test-page" });

		const drafts = [
			{ number: 0, text: "Title", textAndOccurrenceHash: "hash-title" },
			{ number: 1, text: "First paragraph", textAndOccurrenceHash: "hash-p1" },
		];

		// Act
		const result = await db.transaction(async (tx) => {
			return await syncSegments(tx, page.id, drafts, null);
		});

		// Assert: マッピングが正しく返される
		expect(result.size).toBe(2);
		expect(result.has("hash-title")).toBe(true);
		expect(result.has("hash-p1")).toBe(true);

		// Assert: DBにセグメントが作成されている
		const createdSegments = await db
			.select()
			.from(segments)
			.where(eq(segments.contentId, page.id));
		expect(createdSegments).toHaveLength(2);

		const titleSegment = createdSegments.find((s) => s.number === 0);
		expect(titleSegment?.text).toBe("Title");
		expect(titleSegment?.textAndOccurrenceHash).toBe("hash-title");
	});

	it("既存セグメントの番号を更新する", async () => {
		// Arrange: セグメント付きページを作成
		const user = await createUser();
		const page = await createPageWithSegments({
			userId: user.id,
			slug: "test-page",
			segments: [
				{
					number: 0,
					text: "Title",
					textAndOccurrenceHash: "hash-title",
					segmentTypeKey: "PRIMARY",
				},
				{
					number: 1,
					text: "First paragraph",
					textAndOccurrenceHash: "hash-p1",
					segmentTypeKey: "PRIMARY",
				},
			],
		});

		// 番号を入れ替えたドラフト（p1が先頭に）
		const drafts = [
			{ number: 0, text: "First paragraph", textAndOccurrenceHash: "hash-p1" },
			{ number: 1, text: "Title", textAndOccurrenceHash: "hash-title" },
		];

		// Act
		await db.transaction(async (tx) => {
			return await syncSegments(tx, page.id, drafts, null);
		});

		// Assert: 番号が更新されている
		const updatedSegments = await db
			.select()
			.from(segments)
			.where(eq(segments.contentId, page.id));

		const titleSegment = updatedSegments.find(
			(s) => s.textAndOccurrenceHash === "hash-title",
		);
		const p1Segment = updatedSegments.find(
			(s) => s.textAndOccurrenceHash === "hash-p1",
		);

		expect(titleSegment?.number).toBe(1);
		expect(p1Segment?.number).toBe(0);
	});

	it("不要なセグメントを削除する", async () => {
		// Arrange: 3つのセグメントを持つページを作成
		const user = await createUser();
		const page = await createPageWithSegments({
			userId: user.id,
			slug: "test-page",
			segments: [
				{
					number: 0,
					text: "Title",
					textAndOccurrenceHash: "hash-title",
					segmentTypeKey: "PRIMARY",
				},
				{
					number: 1,
					text: "First paragraph",
					textAndOccurrenceHash: "hash-p1",
					segmentTypeKey: "PRIMARY",
				},
				{
					number: 2,
					text: "Second paragraph",
					textAndOccurrenceHash: "hash-p2",
					segmentTypeKey: "PRIMARY",
				},
			],
		});

		// 2番目のパラグラフを削除したドラフト
		const drafts = [
			{ number: 0, text: "Title", textAndOccurrenceHash: "hash-title" },
			{ number: 1, text: "First paragraph", textAndOccurrenceHash: "hash-p1" },
		];

		// Act
		await db.transaction(async (tx) => {
			return await syncSegments(tx, page.id, drafts, null);
		});

		// Assert: セグメントが2つに減っている
		const remainingSegments = await db
			.select()
			.from(segments)
			.where(eq(segments.contentId, page.id));

		expect(remainingSegments).toHaveLength(2);

		// hash-p2 は削除されている
		const deletedSegment = remainingSegments.find(
			(s) => s.textAndOccurrenceHash === "hash-p2",
		);
		expect(deletedSegment).toBeUndefined();
	});

	it("追加・更新・削除が同時に発生する複合ケース", async () => {
		// Arrange: 2つのセグメントを持つページを作成
		const user = await createUser();
		const page = await createPageWithSegments({
			userId: user.id,
			slug: "test-page",
			segments: [
				{
					number: 0,
					text: "Title",
					textAndOccurrenceHash: "hash-title",
					segmentTypeKey: "PRIMARY",
				},
				{
					number: 1,
					text: "Old paragraph",
					textAndOccurrenceHash: "hash-old",
					segmentTypeKey: "PRIMARY",
				},
			],
		});

		// ドラフト: Titleの番号変更、Old削除、New追加
		const drafts = [
			{ number: 0, text: "New paragraph", textAndOccurrenceHash: "hash-new" },
			{ number: 1, text: "Title", textAndOccurrenceHash: "hash-title" },
		];

		// Act
		const result = await db.transaction(async (tx) => {
			return await syncSegments(tx, page.id, drafts, null);
		});

		// Assert: マッピングが正しい
		expect(result.size).toBe(2);
		expect(result.has("hash-new")).toBe(true);
		expect(result.has("hash-title")).toBe(true);
		expect(result.has("hash-old")).toBe(false);

		// Assert: DBの状態を確認
		const finalSegments = await db
			.select()
			.from(segments)
			.where(eq(segments.contentId, page.id));

		expect(finalSegments).toHaveLength(2);

		// Titleは番号1に更新
		const titleSegment = finalSegments.find(
			(s) => s.textAndOccurrenceHash === "hash-title",
		);
		expect(titleSegment?.number).toBe(1);

		// Newは番号0で新規作成
		const newSegment = finalSegments.find(
			(s) => s.textAndOccurrenceHash === "hash-new",
		);
		expect(newSegment?.number).toBe(0);
		expect(newSegment?.text).toBe("New paragraph");

		// Oldは削除
		const oldSegment = finalSegments.find(
			(s) => s.textAndOccurrenceHash === "hash-old",
		);
		expect(oldSegment).toBeUndefined();
	});

	it("空のドラフトを渡すと既存セグメントがすべて削除される", async () => {
		// Arrange
		const user = await createUser();
		const page = await createPageWithSegments({
			userId: user.id,
			slug: "test-page",
			segments: [
				{
					number: 0,
					text: "Title",
					textAndOccurrenceHash: "hash-title",
					segmentTypeKey: "PRIMARY",
				},
			],
		});

		// Act
		const result = await db.transaction(async (tx) => {
			return await syncSegments(tx, page.id, [], null);
		});

		// Assert
		expect(result.size).toBe(0);

		const remainingSegments = await db
			.select()
			.from(segments)
			.where(eq(segments.contentId, page.id));
		expect(remainingSegments).toHaveLength(0);
	});

	it("既存セグメントがない状態で新規セグメントを作成する", async () => {
		// Arrange: セグメントなしのページ
		const user = await createUser();
		const page = await createPage({ userId: user.id, slug: "test-page" });

		const drafts = [
			{ number: 0, text: "Title", textAndOccurrenceHash: "hash-title" },
		];

		// Act
		const result = await db.transaction(async (tx) => {
			return await syncSegments(tx, page.id, drafts, null);
		});

		// Assert
		expect(result.size).toBe(1);
		expect(result.has("hash-title")).toBe(true);
	});
});
