import { getCurrentUser } from "@/auth";
import { mockUsers } from "@/tests/mock";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { deletePageComment } from "../_db/mutations.server";
import { getPageCommentById } from "../_db/queries.server";
import { commentDeleteAction } from "./action";
// Mock dependencies
vi.mock("@/auth", () => ({
	getCurrentUser: vi.fn(),
}));

vi.mock("./_db/queries.server", () => ({
	getPageCommentById: vi.fn(),
}));

vi.mock("./_db/mutations.server", () => ({
	deletePageComment: vi.fn(),
}));

vi.mock("next/cache", () => ({
	revalidatePath: vi.fn(),
}));

vi.mock("next/navigation", () => ({
	redirect: vi.fn(),
}));

describe("commentDeleteAction", () => {
	const mockPageComment = {
		id: 1,
		parentId: null,
		userId: mockUsers[0].id,
		content: "test comment",
		pageId: 100,
		locale: "en",
		createdAt: new Date(),
		updatedAt: new Date(),
	};

	const mockFormData = new FormData();
	mockFormData.append("pageCommentId", "1");
	mockFormData.append("pageId", "100");

	const mockPreviousState = { success: true };

	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(getCurrentUser).mockResolvedValue(mockUsers[0]);
		vi.mocked(getPageCommentById).mockResolvedValue(mockPageComment);
	});

	it("should redirect if user is not authenticated", async () => {
		vi.mocked(getCurrentUser).mockResolvedValue(undefined);

		await commentDeleteAction(mockPreviousState, mockFormData);

		expect(redirect).toHaveBeenCalledWith("/auth/login");
	});

	it("should return error if form data is invalid", async () => {
		vi.mocked(getCurrentUser).mockResolvedValue(mockUsers[0]);

		const invalidFormData = new FormData();
		invalidFormData.append("pageCommentId", "invalid");
		invalidFormData.append("pageId", "invalid");

		const result = await commentDeleteAction(
			mockPreviousState,
			invalidFormData,
		);

		expect(result.success).toBe(false);
		expect(result.zodErrors).toBeDefined();
	});

	it("should return error if comment does not exist", async () => {
		vi.mocked(getCurrentUser).mockResolvedValue(mockUsers[0]);
		vi.mocked(getPageCommentById).mockResolvedValue(null);

		const result = await commentDeleteAction(mockPreviousState, mockFormData);

		expect(result.success).toBe(false);
		expect(result.message).toBe("You are not allowed to delete this comment");
	});

	it("should return error if user is not the comment owner", async () => {
		vi.mocked(getCurrentUser).mockResolvedValue(mockUsers[0]);
		vi.mocked(getPageCommentById).mockResolvedValue({
			...mockPageComment,
			userId: mockUsers[1].id, // Different user
		});

		const result = await commentDeleteAction(mockPreviousState, mockFormData);

		expect(result.success).toBe(false);
		expect(result.message).toBe("You are not allowed to delete this comment");
	});

	it("should successfully delete comment and revalidate path", async () => {
		vi.mocked(getCurrentUser).mockResolvedValue(mockUsers[0]);
		vi.mocked(getPageCommentById).mockResolvedValue(mockPageComment);
		vi.mocked(deletePageComment).mockResolvedValue(mockPageComment);

		const result = await commentDeleteAction(mockPreviousState, mockFormData);

		expect(result.success).toBe(true);
		expect(deletePageComment).toHaveBeenCalledWith(1);
		expect(revalidatePath).toHaveBeenCalledWith("/user/mockUserId1/page/100");
	});
});
