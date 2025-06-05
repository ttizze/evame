// VoteButton.test.tsx
import { render, screen } from "@testing-library/react";
import { VoteButton } from "./vote-button";

describe("VoteButton コンポーネント", () => {
	test("upvote タイプの場合、voteCount とアクティブ状態のクラスが正しく表示される", () => {
		render(
			<VoteButton type="upvote" isActive={true} isVoting={false} voteCount={15}>
				{({ iconClass }) => <span data-testid="icon-element">{iconClass}</span>}
			</VoteButton>,
		);

		const button = screen.getByTestId("vote-up-button");
		expect(button).toBeInTheDocument();
		expect(button).not.toBeDisabled();
		// upvote の場合、voteCount がレンダリングされる
		expect(button).toHaveTextContent("15");

		// children で渡された iconClass が正しく生成されているか検証
		const iconElement = screen.getByTestId("icon-element");
		expect(iconElement.textContent).toContain(
			"mr-2 h-4 w-4 transition-all duration-300",
		);
		// isActive が true の場合、fill-primary のクラスが含まれる
		expect(iconElement.textContent).toContain("[&>path]:fill-primary");
		// isVoting が false なので animate-bounce は含まれない
		expect(iconElement.textContent).not.toContain("animate-bounce");
	});

	test("downvote タイプの場合、voteCount は表示されず、アクティブ状態のクラスも含まれない", () => {
		render(
			<VoteButton
				type="downvote"
				isActive={false}
				isVoting={false}
				voteCount={20}
			>
				{({ iconClass }) => <span data-testid="icon-element">{iconClass}</span>}
			</VoteButton>,
		);

		const button = screen.getByTestId("vote-down-button");
		expect(button).toBeInTheDocument();
		expect(button).not.toBeDisabled();
		// downvote の場合、voteCount は表示されない
		expect(button).not.toHaveTextContent("20");

		const iconElement = screen.getByTestId("icon-element");
		// isActive が false の場合、fill-primary クラスは付与されない
		expect(iconElement.textContent).not.toContain("[&>path]:fill-primary");
	});

	test("isVoting が true の場合、ボタンは disabled になる", () => {
		render(
			<VoteButton type="upvote" isActive={false} isVoting={true} voteCount={5}>
				{({ iconClass }) => <span data-testid="icon-element">{iconClass}</span>}
			</VoteButton>,
		);

		const button = screen.getByTestId("vote-up-button");
		expect(button).toBeDisabled();
	});

	test("isVoting が true の場合、iconClass に animate-bounce が含まれる", () => {
		render(
			<VoteButton type="downvote" isActive={false} isVoting={true}>
				{({ iconClass }) => <span data-testid="icon-element">{iconClass}</span>}
			</VoteButton>,
		);

		const iconElement = screen.getByTestId("icon-element");
		expect(iconElement.textContent).toContain("animate-bounce");
	});
});
