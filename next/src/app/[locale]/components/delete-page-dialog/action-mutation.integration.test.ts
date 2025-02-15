import { getCurrentUser } from "@/auth";
import { prisma } from "@/lib/prisma";
import { mockUsers } from "@/tests/mock";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { archivePageAction } from "./action";
// Mock the dependencies
vi.mock("@/auth");
vi.mock("next/cache");

describe("archivePageAction", () => {
	beforeEach(async () => {
		await prisma.user.deleteMany();
		await prisma.page.deleteMany();
		await prisma.user.create({
			data: {
				id: mockUsers[0].id,
				handle: mockUsers[0].handle,
				email: "",
				name: mockUsers[0].name,
				image: mockUsers[0].image,
			},
		});
		await prisma.page.create({
			data: {
				id: 1,
				userId: mockUsers[0].id,
				slug: "test",
				content: "test",
			},
		});
		await prisma.page.create({
			data: {
				id: 2,
				userId: mockUsers[0].id,
				slug: "test2",
				content: "test2",
			},
		});

		vi.mocked(getCurrentUser).mockResolvedValue(mockUsers[0]);
	});

	afterEach(async () => {
		await prisma.user.deleteMany();
		await prisma.page.deleteMany();
		vi.clearAllMocks();
	});

	it("should successfully archive pages when all conditions are met", async () => {
		const formData = new FormData();
		formData.append("pageIds", "1,2");

		const result = await archivePageAction({ success: false }, formData);

		expect(result.success).toBe(true);
	});

	it("should successfully archive pages when 1", async () => {
		const formData = new FormData();
		formData.append("pageIds", "1");

		const result = await archivePageAction({ success: false }, formData);
		expect(result.success).toBe(true);
	});

	it("should return auth error when user is not authenticated", async () => {
		vi.mocked(getCurrentUser).mockResolvedValue(undefined);

		const formData = new FormData();
		formData.append("pageIds", "1,2");

		await expect(
			archivePageAction({ success: false }, formData),
		).rejects.toThrow("NEXT_REDIRECT");
	});

	it("should return error when pageIds are missing", async () => {
		const formData = new FormData();

		const result = await archivePageAction({ success: false }, formData);

		expect(result.success).toBe(false);
	});

	it("should return unauthorized error when user doesn't own all pages", async () => {
		vi.mocked(getCurrentUser).mockResolvedValue(undefined);
		const formData = new FormData();
		formData.append("pageIds", "2");

		await expect(
			archivePageAction({ success: false }, formData),
		).rejects.toThrow("NEXT_REDIRECT");
	});
});
