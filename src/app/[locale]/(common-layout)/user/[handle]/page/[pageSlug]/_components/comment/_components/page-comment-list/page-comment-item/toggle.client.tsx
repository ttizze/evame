"use client";

import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { parseAsArrayOf, parseAsInteger, useQueryState } from "nuqs";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { COMMENT_EXPANDED_IDS_KEY } from "../../../_constants/query-keys";
import { PageCommentForm } from "../../page-comment-form/client";

interface RepliesToggleProps {
	commentId: number;
	isExpanded: boolean;
	replyCount: number;
	pageId: number;
	userLocale: string;
}

export function RepliesToggle({
	commentId,
	isExpanded,
	replyCount,
	pageId,
	userLocale,
}: RepliesToggleProps) {
	const [isPending, startTransition] = useTransition();
	const [expandedIds, setExpandedIds] = useQueryState(
		COMMENT_EXPANDED_IDS_KEY,
		parseAsArrayOf(parseAsInteger).withDefault([]).withOptions({
			shallow: false,
			startTransition,
		}),
	);
	const [isReplying, setIsReplying] = useState(false);

	const toggleExpand = async () => {
		const set = new Set(expandedIds);
		if (set.has(commentId)) set.delete(commentId);
		else set.add(commentId);
		await setExpandedIds(Array.from(set));
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
