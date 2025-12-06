import { Button } from "@/components/ui/button";

interface VoteButtonProps {
	type: "upvote" | "downvote";
	isActive: boolean | undefined;
	isVoting: boolean;
	voteCount?: number;
	children: (props: { iconClass: string }) => React.ReactNode;
}
export function VoteButton({
	type,
	isActive,
	isVoting,
	voteCount,
	children,
}: VoteButtonProps) {
	// テスト用の属性を設定
	const testId = type === "upvote" ? "vote-up-button" : "vote-down-button";
	// 状態に応じたクラス名を生成
	const iconClass = `mr-2 h-4 w-4 transition-all duration-300 ${
		isActive ? "[&>path]:fill-primary" : ""
	} ${isVoting ? "animate-bounce" : ""}`;

	return (
		<Button
			data-testid={testId}
			disabled={isVoting}
			name="isUpvote"
			size="sm"
			type="submit"
			value={type === "upvote" ? "true" : "false"}
			variant="ghost"
		>
			{children({ iconClass })}
			{type === "upvote" && voteCount !== undefined && voteCount}
		</Button>
	);
}
