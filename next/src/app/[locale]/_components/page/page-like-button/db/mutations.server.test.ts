import { prisma } from "@/lib/prisma";
import type { Page, User } from "@prisma/client";
import { beforeEach, describe, expect, it } from "vitest";
import { togglePageLike } from "./mutations.server";

describe("toggleLike 実際のDB統合テスト", () => {
	let testUser: User;
	let publicPage: Page;
	let privatePage: Page;
	let archivedPage: Page;
	beforeEach(async () => {
		await prisma.user.deleteMany();
		await prisma.page.deleteMany();
		const createdUser = await prisma.user.create({
			data: {
				handle: "testuser",
				name: "Test User",
				image: "https://example.com/image.jpg",
				profile: "This is a test profile",
				email: "testuser@example.com",
				pages: {
					create: [
						{
							slug: "public-page",
							status: "PUBLIC",
							content: "This is a test content",
							pageSegments: {
								create: {
									number: 0,
									text: "Public Page",
									textAndOccurrenceHash: "hash0",
								},
							},
						},
						{
							slug: "private-page",
							status: "DRAFT",
							content: "This is a test content2",
							pageSegments: {
								create: {
									number: 0,
									text: "Private Page",
									textAndOccurrenceHash: "hash1",
								},
							},
						},
						{
							slug: "archived-page",
							status: "ARCHIVE",
							content: "This is a test content3",
							pageSegments: {
								create: {
									number: 0,
									text: "Archived Page",
									textAndOccurrenceHash: "hash2",
								},
							},
						},
					],
				},
			},
			include: { pages: true },
		});
		testUser = createdUser;
		// 生成された pages から該当のものを抜き出す
		const foundPublicPage = createdUser.pages?.find(
			(p) => p.slug === "public-page",
		);
		if (!foundPublicPage) {
			throw new Error("public-page が見つかりません");
		}
		publicPage = foundPublicPage;
		const foundPrivatePage = createdUser.pages?.find(
			(p) => p.slug === "private-page",
		);
		if (!foundPrivatePage) {
			throw new Error("private-page が見つかりません");
		}
		privatePage = foundPrivatePage;
		const foundArchivedPage = createdUser.pages?.find(
			(p) => p.slug === "archived-page",
		);
		if (!foundArchivedPage) {
			throw new Error("archived-page が見つかりません");
		}
		archivedPage = foundArchivedPage;
	});
	afterEach(async () => {
		await prisma.user.deleteMany();
		await prisma.page.deleteMany();
	});

	it("userIdを指定した場合にlikeが新規作成される", async () => {
		const result = await togglePageLike(publicPage.id, {
			type: "user",
			id: testUser.id,
		});
		expect(result).toStrictEqual({ liked: true, likeCount: 1 });
		// DB側を確認
		const page = await prisma.page.findUnique({
			where: { slug: publicPage.slug },
			include: { likePages: true },
		});
		const likeEntries = await prisma.likePage.findMany({
			where: { pageId: page?.id },
		});
		expect(likeEntries.length).toBe(1);
		expect(likeEntries[0].userId).toBe(testUser.id);
	});

	it("userIdが既にlike済なら削除→liked:falseを返す", async () => {
		await togglePageLike(publicPage.id, { type: "user", id: testUser.id });
		const result = await togglePageLike(publicPage.id, {
			type: "user",
			id: testUser.id,
		});
		expect(result).toStrictEqual({ liked: false, likeCount: 0 });

		const remaining = await prisma.likePage.findMany({
			where: { pageId: publicPage.id },
		});
		expect(remaining.length).toBe(0);
	});

	it("guestIdでも同様に動作する (新規作成→liked:true)", async () => {
		const result = await togglePageLike(publicPage.id, {
			type: "guest",
			id: "guest-123",
		});
		expect(result).toStrictEqual({ liked: true, likeCount: 1 });

		const likeEntries = await prisma.likePage.findMany({
			where: { pageId: publicPage.id },
		});
		expect(likeEntries.length).toBe(1);
		expect(likeEntries[0].guestId).toBe("guest-123");
	});

	it("guestIdが既にlike済なら削除→liked:falseを返す", async () => {
		await togglePageLike(publicPage.id, { type: "guest", id: "guest-123" });
		const result = await togglePageLike(publicPage.id, {
			type: "guest",
			id: "guest-123",
		});
		expect(result).toStrictEqual({ liked: false, likeCount: 0 }); // toBe から toStrictEqual に変更

		const remaining = await prisma.likePage.findMany({
			where: { pageId: publicPage.id },
		});
		expect(remaining.length).toBe(0);
	});

	it("Pageが存在しない場合はエラーを投げる", async () => {
		await expect(
			togglePageLike(123413, { type: "user", id: "1" }),
		).rejects.toThrow("Page not found");
	});
});
