"use client";

import { Heart, Loader2 } from "lucide-react";
import { useServerMutation } from "@/app/_hooks/use-server-mutation";
import { Button } from "@/components/ui/button";
import { togglePageLikeAction } from "./action";
import { computeNextLikeState } from "./domain/like-state";
import {
	buildLikeStateKey,
	fetchLikeStates,
	type LikeState,
} from "./service/like-api";

type PageLikeButtonClientProps = {
	pageId: number;
	showCount?: boolean;
	className?: string;
	initialLikeCount: number;
	initialLiked?: boolean;
};

export function PageLikeButtonClient({
	pageId,
	showCount,
	className = "",
	initialLikeCount,
	initialLiked,
}: PageLikeButtonClientProps) {
	const fallbackData: LikeState = {
		liked: initialLiked ?? false,
		likeCount: initialLikeCount,
	};

	const { data, isLoading, isPending, handleSubmit } = useServerMutation({
		swrKey: buildLikeStateKey(pageId),
		fetcher: async (url: string) => {
			const res = await fetchLikeStates(url);
			const state = res.states[String(pageId)];
			return state ?? fallbackData;
		},
		serverAction: togglePageLikeAction,
		fallbackData,
		onBeforeAction: (_, currentData) => {
			if (currentData.liked === undefined) return currentData;
			return computeNextLikeState(currentData);
		},
		transformActionResult: (actionData) => actionData,
	});

	return (
		<div className="flex items-center gap-2">
			<form action={handleSubmit}>
				<input name="pageId" type="hidden" value={pageId} />
				<Button
					aria-label="Like"
					className={`bg-background cursor-pointer ${className}`}
					disabled={isPending || isLoading}
					size="icon"
					type="submit"
					variant="ghost"
				>
					{isPending || isLoading ? (
						<Loader2 className="h-5 w-5 rounded-full" />
					) : (
						<Heart
							className={`h-5 w-5 rounded-full ${data?.liked ? "text-red-500" : ""}`}
							fill={data?.liked ? "currentColor" : "none"}
						/>
					)}
				</Button>
			</form>
			{showCount && data && (
				<span className="text-muted-foreground">{data.likeCount}</span>
			)}
		</div>
	);
}
