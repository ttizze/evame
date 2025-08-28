"use client";

import {
	ChevronDown,
	ChevronRight,
	Loader2,
	MessageSquarePlus,
} from "lucide-react";
import { parseAsArrayOf, parseAsInteger, useQueryState } from "nuqs";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";

interface RepliesToggleProps {
	commentId: number;
	isExpanded: boolean;
	replyCount: number;
}

export function RepliesToggle({
	commentId,
	isExpanded,
	replyCount,
}: RepliesToggleProps) {
	const [isPending, startTransition] = useTransition();
	const [expandedIds, setExpandedIds] = useQueryState(
		"ex",
		parseAsArrayOf(parseAsInteger).withDefault([]).withOptions({
			shallow: false,
			startTransition,
		}),
	);

	const toggle = async () => {
		const set = new Set(expandedIds);
		if (set.has(commentId)) set.delete(commentId);
		else set.add(commentId);
		await setExpandedIds(Array.from(set));
	};

	return (
		<div className="mt-2 flex items-center gap-2">
			<Button
				className="h-7 px-2"
				disabled={isPending}
				onClick={toggle}
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
			<Button asChild className="h-7 px-2" size="sm" variant="ghost">
				<a href="#reply">
					<MessageSquarePlus className="w-4 h-4 mr-1" />
					<span className="text-xs">Reply</span>
				</a>
			</Button>
		</div>
	);
}
