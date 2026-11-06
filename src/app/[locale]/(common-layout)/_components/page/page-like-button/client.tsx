import { Heart, Loader2 } from "lucide-react";
import { useTransition } from "react";
import useSWR from "swr";
import { useHydrated } from "@/app/_hooks/use-hydrated";
import { callReaderAction } from "@/app/_service/reader-action";
import { Button } from "@/components/ui/button";
import { computeNextLikeState } from "./domain/like-state";
import {
	buildLikeStateKey,
	fetchLikeStates,
	type LikeStatesResponse,
} from "./service/like-api";

export function PageLikeButtonClient({
	pageId,
	showCount,
	initialLikeCount,
}: {
	pageId: number;
	showCount: boolean;
	initialLikeCount: number;
}) {
	const hydrated = useHydrated();
	const [isPending, startTransition] = useTransition();
	const fallbackData = { liked: false, likeCount: initialLikeCount };
	const { data, mutate, isLoading } = useSWR<LikeStatesResponse>(
		buildLikeStateKey(pageId),
		fetchLikeStates,
		{
			fallbackData: { states: { [pageId]: fallbackData } },
			revalidateOnFocus: false,
			revalidateIfStale: false,
			revalidateOnMount: false,
		},
	);
	const displayed = hydrated
		? (data?.states[pageId] ?? fallbackData)
		: fallbackData;
	return (
		<div className="flex items-center gap-2">
			<Button
				aria-label="Like"
				className="bg-background cursor-pointer"
				disabled={!hydrated || isPending || isLoading}
				onClick={() => {
					void mutate(
						{ states: { [pageId]: computeNextLikeState(displayed) } },
						{ revalidate: false },
					);
					startTransition(async () => {
						const result = await callReaderAction("like", { pageId });
						if (result.success)
							await mutate(
								{ states: { [pageId]: result.data } },
								{ revalidate: false },
							);
					});
				}}
				size="icon"
				type="button"
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
			{showCount && displayed && (
				<span className="text-muted-foreground">{displayed.likeCount}</span>
			)}
		</div>
	);
}
