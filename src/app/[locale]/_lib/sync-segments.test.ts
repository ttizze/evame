import { ContentKind, type Segment } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { generateHashForText } from "@/app/[locale]/_lib/generate-hash-for-text";
import type { SegmentDraft } from "@/app/[locale]/_lib/remark-hash-and-segments";
import { syncSegments } from "@/app/[locale]/_lib/sync-segments";
import { prisma } from "@/lib/prisma";

describe("syncSegments", () => {
	let contentId: number | null = null;

	beforeEach(async () => {
		const content = await prisma.content.create({
			data: { kind: ContentKind.PAGE },
		});
		contentId = content.id;
	});

	afterEach(async () => {
		if (contentId === null) return;
		await prisma.segment.deleteMany({ where: { contentId } });
		await prisma.content.delete({ where: { id: contentId } });
		contentId = null;
	});

	test("upserts and reorders segments while dropping stale entries", async () => {
		if (contentId === null) throw new Error("contentId not initialized");

		const initialDrafts: SegmentDraft[] = [
			{ hash: generateHashForText("Title", 0), text: "Title", number: 0 },
			{ hash: generateHashForText("Line 1", 1), text: "Line 1", number: 1 },
			{ hash: generateHashForText("Line 2", 1), text: "Line 2", number: 2 },
		];

		await syncSegments(prisma, contentId, initialDrafts);

		let stored = await prisma.segment.findMany({
			where: { contentId },
			orderBy: { number: "asc" },
		});

		expect(stored.map((s: Segment) => s.text)).toEqual([
			"Title",
			"Line 1",
			"Line 2",
		]);

		const updatedDrafts: SegmentDraft[] = [
			{ hash: generateHashForText("Title", 0), text: "Title", number: 0 },
			{ hash: generateHashForText("Line 2", 1), text: "Line 2", number: 1 },
			{ hash: generateHashForText("Line 3", 1), text: "Line 3", number: 2 },
		];

		await syncSegments(prisma, contentId, updatedDrafts);

		stored = await prisma.segment.findMany({
			where: { contentId },
			orderBy: { number: "asc" },
		});

		expect(stored.map((s: Segment) => s.text)).toEqual([
			"Title",
			"Line 2",
			"Line 3",
		]);
		expect(stored.find((s) => s.text === "Line 2")?.number).toBe(1);
		expect(stored.some((s) => s.text === "Line 1")).toBe(false);
	});

	test("deletes all segments when drafts are empty", async () => {
		if (contentId === null) throw new Error("contentId not initialized");

		const drafts: SegmentDraft[] = [
			{ hash: generateHashForText("Title", 0), text: "Title", number: 0 },
			{ hash: generateHashForText("Line 1", 1), text: "Line 1", number: 1 },
		];

		await syncSegments(prisma, contentId, drafts);

		await syncSegments(prisma, contentId, []);

		const stored = await prisma.segment.findMany({ where: { contentId } });
		expect(stored).toHaveLength(0);
	});
});
