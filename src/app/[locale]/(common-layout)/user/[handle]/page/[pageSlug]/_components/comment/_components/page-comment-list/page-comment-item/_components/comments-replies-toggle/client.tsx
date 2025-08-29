"use client";

import {
	ChevronDown,
	ChevronRight,
	Loader2,
	MessageCirclePlus,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useExpandedComments } from "../../../../../_hooks/use-expanded-comments";
import { PageCommentForm } from "../../../../page-comment-form/client";

interface CommentRepliesToggleProps {
	commentId: number;
	isExpanded: boolean;
	replyCount: number;
	pageId: number;
	userLocale: string;
}

export function CommentRepliesToggle({
	commentId,
	isExpanded,
	replyCount,
	pageId,
	userLocale,
}: CommentRepliesToggleProps) {
	const { isPending, toggleExpandedId } = useExpandedComments();
	const [isReplying, setIsReplying] = useState(false);

	const toggleExpand = async () => {
		toggleExpandedId(commentId);
	};

	return (
		<div className="mt-2">
			<div className="flex items-center gap-2">
				{replyCount > 0 && (
					<Button
						className="h-7 px-2"
						disabled={isPending}
						onClick={toggleExpand}
						size="sm"
						variant="ghost"
					>
						{isPending ? (
							<Loader2 className="w-4 h-4 mr-1 animate-spin" />
						) : isExpanded ? (
							<ChevronDown className="w-4 h-4 mr-1" />
						) : (
							<ChevronRight className="w-4 h-4 mr-1" />
						)}
						<span className="text-xs text-muted-foreground">
							{isExpanded ? "Hide replies" : `Show replies (${replyCount})`}
						</span>
					</Button>
				)}
				<Button
					className="h-7 px-2"
					onClick={() => setIsReplying((v) => !v)}
					size="sm"
					variant="ghost"
				>
					<MessageCirclePlus className="w-4 h-4 mr-1" />
					<span className="text-xs">Reply</span>
				</Button>
			</div>

			{isReplying && (
				<div className="mt-2">
					<PageCommentForm
						onReplySuccess={() => setIsReplying(false)}
						pageId={pageId}
						parentId={commentId}
						userLocale={userLocale}
					/>
				</div>
			)}
		</div>
	);
}
