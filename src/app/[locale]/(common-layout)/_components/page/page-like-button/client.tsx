import { useTransition } from "react";
import useSWR from "swr";
import { useHydrated } from "@/app/_hooks/use-hydrated";
import { callReaderAction } from "@/app/_service/reader-action";
import { LikeButton } from "../../../../../../../shared/like-button";
import { computeNextLikeState } from "../../../../../../../shared/like-state";
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
		<LikeButton
			disabled={!hydrated || isPending || isLoading}
			likeCount={showCount ? displayed.likeCount : null}
			liked={displayed.liked}
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
			pageId={pageId}
			pending={isPending || isLoading}
		/>
	);
}
