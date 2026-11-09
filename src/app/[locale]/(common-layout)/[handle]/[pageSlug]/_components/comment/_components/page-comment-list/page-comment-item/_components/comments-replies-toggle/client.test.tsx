import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { CommentUpdates } from "../../../../../comment-updates";
import { CommentRepliesToggle } from "./client";

vi.mock("../../../../page-comment-form/client", () => ({
	PageCommentForm: () => <div data-testid="reply-form" />,
}));

it("コメント受付を止めると、開いていた返信フォームと返信ボタンを閉じる", () => {
	const refresh = async () => {};
	const props = { commentId: 1, pageId: 2, replyCount: 3, userLocale: "ja" };
	const { rerender } = render(
		<CommentUpdates value={{ commentsEnabled: true, refresh }}>
			<CommentRepliesToggle {...props} />
		</CommentUpdates>,
	);
	fireEvent.click(screen.getByRole("button", { name: "Reply (3)" }));
	expect(screen.getByTestId("reply-form")).toBeVisible();
	rerender(
		<CommentUpdates value={{ commentsEnabled: false, refresh }}>
			<CommentRepliesToggle {...props} />
		</CommentUpdates>,
	);
	expect(
		screen.queryByRole("button", { name: "Reply (3)" }),
	).not.toBeInTheDocument();
	expect(screen.queryByTestId("reply-form")).not.toBeInTheDocument();
});
