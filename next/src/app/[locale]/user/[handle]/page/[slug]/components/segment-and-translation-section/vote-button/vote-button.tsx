import { ThumbsDown, ThumbsUp } from "lucide-react";
import { memo } from "react";
import { Button } from "@/components/ui/button";

export const VoteButton = memo(function VoteButton({
	isUpvote,
	isDisabled,
	point,
	iconClass,
	onClick,
}: {
	isUpvote: boolean;
	isDisabled: boolean;
	point?: number;
	iconClass: string;
	onClick: (e: React.MouseEvent, isUpvote: boolean) => void;
}) {
	const Icon = isUpvote ? ThumbsUp : ThumbsDown;
	return (
		<Button
			variant="ghost"
			size="sm"
			type="button"
			name="isUpvote"
			value={isUpvote.toString()}
			disabled={isDisabled}
			onClick={(e) => onClick(e, isUpvote)}
		>
			<Icon className={iconClass} />
			{isUpvote && point}
		</Button>
	);
});
