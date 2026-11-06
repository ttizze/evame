import { Heart, Loader2 } from "lucide-react";
import { useActionState } from "react";
import useSWR from "swr";
import { useHydrated } from "@/app/_hooks/use-hydrated";
import { callReaderAction } from "@/app/_service/reader-action";
import type { PageLikeButtonState } from "@/app/api/reader-actions/_service/toggle-like";
import { Button } from "@/components/ui/button";
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
	const hydrated = useHydrated();
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

	// The server function returns the latest liked/count; prefer it when available
	const [_, formAction, isPending] = useActionState<
		PageLikeButtonState,
		FormData
	>(
		async (_previousState, formData) => {
			const result = await callReaderAction("like", {
				pageId: Number(formData.get("pageId")),
			});
			if (result.success) {
				void mutate(result.data, { revalidate: false });
			}
			return result;
		},
		{ success: false },
	);

	const displayed = hydrated ? data : fallbackData;
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

		// Trigger the server function
		formAction(formData);
	};

	return (
		<div className="flex items-center gap-2">
			<form action={handleSubmit}>
				<input name="pageId" type="hidden" value={pageId} />
				<Button
					aria-label="Like"
					className={`bg-background cursor-pointer ${className}`}
					disabled={!hydrated || isPending || isLoading}
					size="icon"
					type="submit"
					variant="ghost"
				>
					{isPending || isLoading ? (
						<Loader2 className="h-5 w-5 rounded-full" />
					) : (
						<Heart
							className={`h-5 w-5 rounded-full ${displayed?.liked ? "text-red-500" : ""}`}
							fill={displayed?.liked ? "currentColor" : "none"}
						/>
					)}
				</Button>
			</form>
			{showCount && displayed && (
				<span className="text-muted-foreground">{displayed.likeCount}</span>
			)}
		</div>
	);
}
