import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import { callReaderAction } from "@/app/_service/reader-action";
import { FollowButtonClient } from "./client";

vi.mock("@/app/_service/reader-action", () => ({
	callReaderAction: vi.fn(),
}));

beforeEach(() => vi.clearAllMocks());

it("新着通知を登録し、同じボタンから解除して再登録できる", async () => {
	vi.mocked(callReaderAction)
		.mockResolvedValueOnce({ success: true, data: { isFollowing: true } })
		.mockResolvedValueOnce({ success: true, data: { isFollowing: false } })
		.mockResolvedValueOnce({ success: true, data: { isFollowing: true } });
	render(
		<FollowButtonClient
			isFollowing={false}
			locale="ja"
			targetUserId="author"
		/>,
	);
	const user = userEvent.setup();
	await user.click(screen.getByRole("button", { name: "新着記事を受け取る" }));
	await user.click(
		await screen.findByRole("button", { name: "新着通知を解除" }),
	);
	await user.click(
		await screen.findByRole("button", { name: "新着記事を受け取る" }),
	);
	expect(
		await screen.findByRole("button", { name: "新着通知を解除" }),
	).toBeEnabled();
	expect(
		vi.mocked(callReaderAction).mock.calls.map(([, input]) => input),
	).toEqual([
		{ targetUserId: "author", locale: "ja", action: "follow" },
		{ targetUserId: "author", locale: "ja", action: "unFollow" },
		{ targetUserId: "author", locale: "ja", action: "follow" },
	]);
});

it("解除に失敗しても登録状態を維持し、解除を再試行できる", async () => {
	vi.mocked(callReaderAction).mockResolvedValue({
		success: false,
		message: "保存に失敗しました",
	});
	render(
		<FollowButtonClient isFollowing={true} locale="ja" targetUserId="author" />,
	);
	const user = userEvent.setup();
	await user.click(screen.getByRole("button", { name: "新着通知を解除" }));
	await waitFor(() =>
		expect(screen.getByRole("alert")).toHaveTextContent("保存に失敗しました"),
	);
	await user.click(screen.getByRole("button", { name: "新着通知を解除" }));
	expect(callReaderAction).toHaveBeenLastCalledWith("follow", {
		targetUserId: "author",
		locale: "ja",
		action: "unFollow",
	});
});
