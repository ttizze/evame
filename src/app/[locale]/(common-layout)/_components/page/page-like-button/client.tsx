"use client";

import { Heart, Loader2 } from "lucide-react";
import { useActionState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { type PageLikeButtonState, togglePageLikeAction } from "./action";
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
	const fallbackData = {
		liked: initialLiked ?? false,
		likeCount: initialLikeCount,
	};

	const swrKey = buildLikeStateKey(pageId);
	const { data, mutate, isLoading } = useSWR<LikeState>(
		swrKey,
		async (url: string) => {
			const res = await fetchLikeStates(url);
			//pageIdでlikeStateを取り出す
			const state = res.states[String(pageId)];
			return state ?? fallbackData;
		},
		{
			fallbackData,
			revalidateOnFocus: false,
			revalidateIfStale: false,
			revalidateOnMount: false,
		},
	);

	// Server action returns latest liked/count; prefer it when available
	const [_, formAction, isPending] = useActionState<
		PageLikeButtonState,
		FormData
	>(
		async (prevState, formData) => {
			const result = await togglePageLikeAction(prevState, formData);
			if (result.success) {
				void mutate(result.data, { revalidate: false });
			}
			return result;
		},
		{ success: false },
	);

	const handleSubmit = (formData: FormData) => {
		// Guard until initial state is loaded
		if (!data) return;
		if (data.liked === undefined) {
			formAction(formData);
			return;
		}

		// Compute and broadcast optimistic next state for all instances
		const next = computeNextLikeState(data);
		mutate(next, { revalidate: false });

		// Trigger server action
		formAction(formData);
	};

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
