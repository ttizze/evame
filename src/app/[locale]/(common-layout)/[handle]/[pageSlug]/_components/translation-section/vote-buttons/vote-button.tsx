import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

type VoteButtonProps = {
	type: "upvote" | "downvote";
	isActive: boolean | undefined;
	isVoting: boolean;
	voteCount?: string;
	ariaLabel: string;
	onClick: () => void;
	children: (props: { iconClass: string }) => ReactNode;
};

export function VoteButton({
	type,
	isActive,
	isVoting,
	voteCount,
	ariaLabel,
	onClick,
	children,
}: VoteButtonProps) {
	const testId = type === "upvote" ? "vote-up-button" : "vote-down-button";
	const iconClass = `mr-2 h-4 w-4 transition-all duration-300 ${
		isActive ? "[&>path]:fill-primary" : ""
	} ${isVoting ? "animate-bounce" : ""}`;

	return (
		<Button
			aria-label={ariaLabel}
			aria-pressed={isActive === true}
			data-testid={testId}
			disabled={isVoting}
			name="isUpvote"
			onClick={onClick}
			size="sm"
			type="button"
			value={type === "upvote" ? "true" : "false"}
			variant="ghost"
		>
			{children({ iconClass })}
			{type === "upvote" && voteCount !== undefined && voteCount}
		</Button>
	);
}
