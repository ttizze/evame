import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { describe, expect, test, vi } from "vitest";
import { CommentList } from "./CommentList";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({
		t: (key: string) => key,
		i18n: { language: "en" },
	}),
}));

describe("CommentList", () => {
	const mockCommentsWithUser = [
		{
			id: 1,
			content: "Test comment",
			createdAt: "2024-01-08T12:00:00Z",
			updatedAt: "2024-01-08T12:00:00Z",
			userId: 1,
			user: {
				userName: "testuser",
				displayName: "Test User",
				icon: "test-icon.png",
			},
			pageId: 1,
		},
	];

	test("renders comments correctly", () => {
		render(
			<CommentList commentsWithUser={mockCommentsWithUser} currentUserId={2} />,
		);

		expect(screen.getByText("Test comment")).toBeInTheDocument();
		expect(screen.getByText("Test User")).toBeInTheDocument();
	});

	test("shows delete button for own comments", () => {
		render(
			<CommentList commentsWithUser={mockCommentsWithUser} currentUserId={1} />,
		);

		expect(screen.getByText("comment.delete")).toBeInTheDocument();
	});

	test("hides delete button for other users' comments", () => {
		render(
			<CommentList commentsWithUser={mockCommentsWithUser} currentUserId={2} />,
		);

		expect(screen.queryByText("comment.delete")).not.toBeInTheDocument();
	});

	test("calls onDelete when delete button is clicked", async () => {
		const onDelete = vi.fn();
		const mockFetch = vi.fn(() =>
			Promise.resolve(
				new Response(JSON.stringify({ success: true }), {
					status: 200,
					headers: { "Content-Type": "application/json" },
				}),
			),
		) as unknown as typeof fetch;
		vi.stubGlobal("fetch", mockFetch);

		render(
			<CommentList
				commentsWithUser={mockCommentsWithUser}
				currentUserId={1}
				onDelete={onDelete}
			/>,
		);

		const deleteButton = screen.getByText("comment.delete");
		await fireEvent.click(deleteButton);

		expect(mockFetch).toHaveBeenCalledWith("/resources/comment", {
			method: "POST",
			body: expect.any(FormData),
		});
		expect(onDelete).toHaveBeenCalledWith(1);
	});

	test("handles delete error", async () => {
		const onDelete = vi.fn();
		const mockFetch = vi.fn(() =>
			Promise.resolve(
				new Response(JSON.stringify({ error: "Failed to delete" }), {
					status: 400,
					headers: { "Content-Type": "application/json" },
				}),
			),
		) as unknown as typeof fetch;
		vi.stubGlobal("fetch", mockFetch);
		const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

		render(
			<CommentList
				commentsWithUser={mockCommentsWithUser}
				currentUserId={1}
				onDelete={onDelete}
			/>,
		);

		const deleteButton = screen.getByText("comment.delete");
		await fireEvent.click(deleteButton);

		expect(onDelete).not.toHaveBeenCalled();
		expect(consoleSpy).toHaveBeenCalledWith(
			"Failed to delete comment:",
			expect.any(Error),
		);

		consoleSpy.mockRestore();
	});
});
