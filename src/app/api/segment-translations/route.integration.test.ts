import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { resetDatabase } from "@/tests/db-helpers";
import { createPageWithSegments, createUser } from "@/tests/factories";
import { setupDbPerFile } from "@/tests/test-db-manager";
import { GET } from "./route";

await setupDbPerFile(import.meta.url);

// 共有依存（認証）のみモック
const getCurrentUser = vi.fn();
vi.mock("@/lib/auth-server", () => ({
	getCurrentUser: (...args: unknown[]) => getCurrentUser(...args),
}));

describe("/api/segment-translations GET", () => {
	beforeEach(async () => {
		await resetDatabase();
		getCurrentUser.mockReset();
	});

	it("パラメータが不正なら 400", async () => {
		// Arrange
		getCurrentUser.mockResolvedValue({ id: "u1" });

		// Act
		const req = new NextRequest(
			"http://localhost/api/segment-translations?segmentId=abc&userLocale=ja",
		);
		const res = await GET(req);

		// Assert
		expect(res.status).toBe(400);
	});

	it("ORDER BY の先頭が translations の先頭になる", async () => {
		// Arrange
		const currentUser = await createUser();
		const bestUser = await createUser({ handle: "best", name: "Best User" });
		const otherUser = await createUser({ handle: "other", name: "Other User" });

		const page = await createPageWithSegments({
			userId: bestUser.id,
			slug: "test-page",
			segments: [
				{
					number: 0,
					text: "Hello",
					textAndOccurrenceHash: "hash0",
					segmentTypeKey: "PRIMARY",
				},
			],
		});

		// セグメントを取得
		const segment = await db
			.selectFrom("segments")
			.selectAll()
			.where("contentId", "=", page.id)
			.where("number", "=", 0)
			.executeTakeFirstOrThrow();

		// 高ポイントの翻訳（bestTranslationになる）
		const bestTranslation = await db
			.insertInto("segmentTranslations")
			.values({
				segmentId: segment.id,
				locale: "ja",
				text: "best",
				point: 100,
				userId: bestUser.id,
			})
			.returningAll()
			.executeTakeFirstOrThrow();

		// 低ポイントの翻訳（translationsに入る）
		const otherTranslation = await db
			.insertInto("segmentTranslations")
			.values({
				segmentId: segment.id,
				locale: "ja",
				text: "other",
				point: 1,
				userId: otherUser.id,
			})
			.returningAll()
			.executeTakeFirstOrThrow();

		// 現在のユーザーが bestTranslation に投票
		await db
			.insertInto("translationVotes")
			.values({
				translationId: bestTranslation.id,
				userId: currentUser.id,
				isUpvote: true,
			})
			.execute();

		getCurrentUser.mockResolvedValue({ id: currentUser.id });

		// Act
		const req = new NextRequest(
			`http://localhost/api/segment-translations?segmentId=${segment.id}&userLocale=ja`,
		);
		const res = await GET(req);

		// Assert
		expect(res.status).toBe(200);

		const body = await res.json();
		expect(body).toHaveLength(2);
		expect(body[0].id).toBe(bestTranslation.id);
		expect(body[0].text).toBe("best");
		expect(body[0].currentUserVoteIsUpvote).toBe(true);
		expect(body[1].id).toBe(otherTranslation.id);
		expect(body[1].text).toBe("other");
		expect(body[1].currentUserVoteIsUpvote).toBeNull();
	});
});
