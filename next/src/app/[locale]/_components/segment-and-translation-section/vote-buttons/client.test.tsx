import type { TargetContentType } from "@/app/[locale]/(common-layout)/user/[handle]/page/[slug]/constants";
import type { BaseTranslation } from "@/app/[locale]/types";
import { render, screen } from "@testing-library/react";
// VoteButtons.test.tsx
import React from "react";
import { vi } from "vitest";
import { VoteButtons } from "./client";
const dummyVoteTarget = "example-target" as TargetContentType;

const dummyTranslationUpvote = {
	id: 1,
	point: 10,
	currentUserVote: { isUpvote: true },
} as BaseTranslation;

const dummyTranslationDownvote = {
	id: 2,
	point: 5,
	currentUserVote: { isUpvote: false },
} as BaseTranslation;

vi.mock("next/form", () => ({
	__esModule: true,
	default: function Form({
		children,
		...props
	}: { children: React.ReactNode }) {
		return <form {...props}>{children}</form>;
	},
}));

describe("VoteButtons コンポーネント", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	test("フォームと hidden input、アップ／ダウンボタンがレンダリングされる", () => {
		// useActionState の戻り値をモック
		vi.spyOn(React, "useActionState").mockReturnValue([
			{ data: { isUpvote: true, point: 10 } },
			vi.fn(),
			false, // isVoting: false
		]);

		render(
			<VoteButtons
				translation={dummyTranslationUpvote}
				targetContentType={dummyVoteTarget}
			/>,
		);

		// hidden input (voteTarget) の検証
		const voteTargetInput = screen.getByDisplayValue(dummyVoteTarget);
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
		vi.spyOn(React, "useActionState").mockReturnValue([
			{ data: { isUpvote: true, point: 10 } },
			vi.fn(),
			false,
		]);

		render(
			<VoteButtons
				translation={dummyTranslationUpvote}
				targetContentType={dummyVoteTarget}
			/>,
		);

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
		vi.spyOn(React, "useActionState").mockReturnValue([
			{ data: { isUpvote: false, point: 5 } },
			vi.fn(),
			false,
		]);

		render(
			<VoteButtons
				translation={dummyTranslationDownvote}
				targetContentType={dummyVoteTarget}
			/>,
		);

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
		vi.spyOn(React, "useActionState").mockReturnValue([
			{ data: { isUpvote: true, point: 10 } },
			vi.fn(),
			true, // isVoting: true
		]);

		render(
			<VoteButtons
				translation={dummyTranslationUpvote}
				targetContentType={dummyVoteTarget}
			/>,
		);

		const upvoteButton = screen.getByTestId("vote-up-button");
		const downvoteButton = screen.getByTestId("vote-down-button");

		expect(upvoteButton.className).toContain("disabled:pointer-events-none");
		expect(downvoteButton.className).toContain("disabled:pointer-events-none");
	});
});
