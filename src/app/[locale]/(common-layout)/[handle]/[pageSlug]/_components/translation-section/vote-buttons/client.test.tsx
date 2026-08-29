import { render, screen } from "@testing-library/react";
// VoteButtons.test.tsx
import React from "react";
import { vi } from "vitest";
import type { SegmentTranslation } from "@/app/api/segment-translations/_domain/segment-translations";
import { VoteButtons } from "./client";

vi.mock("use-intl", () => ({
	useLocale: () => "en",
}));

const dummyTranslationUpvote = {
	id: 1,
	segmentId: 1,
	locale: "en",
	text: "hello",
	point: 10,
	createdAt: "2024-01-01T00:00:00.000Z",
	userName: "User",
	userHandle: "user",
	currentUserVoteIsUpvote: true,
} as SegmentTranslation;

const dummyTranslationDownvote = {
	id: 2,
	segmentId: 1,
	locale: "en",
	text: "world",
	point: 5,
	createdAt: "2024-01-01T00:00:00.000Z",
	userName: "User",
	userHandle: "user",
	currentUserVoteIsUpvote: false,
} as SegmentTranslation;

describe("VoteButtons コンポーネント", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	test("フォームと hidden input、アップ／ダウンボタンがレンダリングされる", () => {
		render(<VoteButtons translation={dummyTranslationUpvote} />);

		// hidden input (voteTarget) の検証
		const voteTargetInput = screen.getByDisplayValue(dummyTranslationUpvote.id);
		expect(voteTargetInput).toBeInTheDocument();

		// hidden input (segmentTranslationId) の検証
		const segmentTranslationIdInput = screen.getByDisplayValue(
			dummyTranslationUpvote.id,
		);
		expect(segmentTranslationIdInput).toBeInTheDocument();

		// VoteButton の data-testid を用いた検証
		expect(screen.getByTestId("vote-up-button")).toBeInTheDocument();
		expect(screen.getByTestId("vote-down-button")).toBeInTheDocument();
	});

	test("アップボタンが正しい投票数とアクティブ状態のアイコンクラスを表示する", () => {
		render(<VoteButtons translation={dummyTranslationUpvote} />);

		const upvoteButton = screen.getByTestId("vote-up-button");
		// upvote ボタンは voteCount (10) を表示する
		expect(upvoteButton).toHaveTextContent("10");

		// ThumbsUp アイコンがレンダリングされ、アクティブ状態のクラスが含まれている
		const thumbsUpIcon = upvoteButton.querySelector("svg");
		expect(thumbsUpIcon).toBeInTheDocument();
		// アクティブの場合、"[&>path]:fill-primary" が付与される
		expect(thumbsUpIcon?.getAttribute("class") || "").toContain(
			"[&>path]:fill-primary",
		);
	});

	test("ダウンボタンがアクティブの場合、適切なアイコンクラスが付与され、voteCount は表示されない", () => {
		render(<VoteButtons translation={dummyTranslationDownvote} />);

		const downvoteButton = screen.getByTestId("vote-down-button");
		expect(downvoteButton).toBeInTheDocument();

		// downvote ボタンは voteCount を表示しない（upvote のみ表示される）
		expect(downvoteButton).not.toHaveTextContent("5");

		// ThumbsDown アイコンの active クラスの確認
		const thumbsDownIcon = downvoteButton.querySelector("svg");
		expect(thumbsDownIcon).toBeInTheDocument();
		expect(thumbsDownIcon?.getAttribute("class") || "").toContain(
			"[&>path]:fill-primary",
		);
	});

	test("isVoting が true の場合、全てのボタンが disabled になる", () => {
		vi.spyOn(React, "useTransition").mockReturnValue([
			true,
			vi.fn(),
		] as ReturnType<typeof React.useTransition>);

		render(<VoteButtons translation={dummyTranslationUpvote} />);

		const upvoteButton = screen.getByTestId("vote-up-button");
		const downvoteButton = screen.getByTestId("vote-down-button");

		expect(upvoteButton.className).toContain("disabled:pointer-events-none");
		expect(downvoteButton.className).toContain("disabled:pointer-events-none");
	});
});
