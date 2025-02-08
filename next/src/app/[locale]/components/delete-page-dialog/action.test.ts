import { getCurrentUser } from "@/auth";
import { PageStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { archivePageAction } from "./action";
import { archivePage } from "./db/mutations.server";
import { getPagesByIds } from "./db/queries.server";
// Mock the dependencies
vi.mock("@/auth");
vi.mock("./db/queries.server");
vi.mock("./db/mutations.server");
vi.mock("next/cache");

describe("archivePageAction", () => {
	const mockUser = {
		id: "mockUser.id",
		handle: "testuser",
		profile: "testuser",
		createdAt: new Date(),
		updatedAt: new Date(),
		totalPoints: 0,
		isAI: false,
		name: "testuser",
		image: "testuser",
	};

	const mockPages = [
		{
			id: 1,
			userId: "mockUser.id",
			content: "test",
			slug: "test",
			sourceLocale: "en",
			status: PageStatus.PUBLIC,
			createdAt: new Date(),
			updatedAt: new Date(),
		},
		{
			id: 2,
			userId: "mockUser.id",
			content: "test",
			slug: "test",
			sourceLocale: "en",
			status: PageStatus.PUBLIC,
			createdAt: new Date(),
			updatedAt: new Date(),
		},
	];

	beforeEach(() => {
		vi.mocked(getCurrentUser).mockResolvedValue(mockUser);
		vi.mocked(getPagesByIds).mockResolvedValue(mockPages);
		vi.mocked(archivePage).mockResolvedValue(mockPages[0]);
		vi.mocked(revalidatePath).mockReturnValue();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it("should successfully archive pages when all conditions are met", async () => {
		const formData = new FormData();
		formData.append("pageIds", "1,2");

		const result = await archivePageAction({}, formData);

		expect(result).toEqual({ success: "Pages archived successfully" });
		expect(archivePage).toHaveBeenCalledTimes(2);
		expect(revalidatePath).toHaveBeenCalledWith("/user/testuser/");
	});

	it("should successfully archive pages when 1", async () => {
		const formData = new FormData();
		formData.append("pageIds", "1");

		const result = await archivePageAction({}, formData);

		expect(result).toEqual({ success: "Pages archived successfully" });
		expect(archivePage).toHaveBeenCalledTimes(1);
		expect(revalidatePath).toHaveBeenCalledWith("/user/testuser/");
	});

	it("should return auth error when user is not authenticated", async () => {
		vi.mocked(getCurrentUser).mockResolvedValue(undefined);

		const formData = new FormData();
		formData.append("pageIds", "1,2");

		const result = await archivePageAction({}, formData);

		expect(result).toEqual({
			fieldErrors: { auth: ["Authentication required"] },
		});
		expect(archivePage).not.toHaveBeenCalled();
	});

	it("should return error when pageIds are missing", async () => {
		const formData = new FormData();

		const result = await archivePageAction({}, formData);

		expect(result).toEqual({
			fieldErrors: { pageId: ["Page ID is required"] },
		});
		expect(archivePage).not.toHaveBeenCalled();
	});

	it("should return unauthorized error when user doesn't own all pages", async () => {
		const unauthorizedPages = [
			{
				id: 1,
				userId: "mockUser.id",
				content: "test",
				slug: "test",
				sourceLocale: "en",
				status: PageStatus.PUBLIC,
				createdAt: new Date(),
				updatedAt: new Date(),
			},
			{
				id: 2,
				userId: "differentUser",
				content: "test",
				slug: "test",
				sourceLocale: "en",
				status: PageStatus.PUBLIC,
				createdAt: new Date(),
				updatedAt: new Date(),
			}, // Different user
		];
		vi.mocked(getPagesByIds).mockResolvedValue(unauthorizedPages);

		const formData = new FormData();
		formData.append("pageIds", "1,2");

		const result = await archivePageAction({}, formData);

		expect(result).toEqual({
			fieldErrors: { auth: ["Unauthorized access"] },
		});
		expect(archivePage).not.toHaveBeenCalled();
	});
});
