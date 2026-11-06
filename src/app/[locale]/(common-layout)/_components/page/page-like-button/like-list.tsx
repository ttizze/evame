import useSWR, { useSWRConfig } from "swr";
import {
	buildLikeStateKey,
	fetchLikeStates,
	type LikeStatesResponse,
} from "./service/like-api";

type PageLikeListClientProps = {
	pageIds: number[];
};

export function PageLikeListClient({ pageIds }: PageLikeListClientProps) {
	const { mutate } = useSWRConfig();

	const uniqueIds = Array.from(new Set(pageIds)).filter((id) => id > 0);

	useSWR<LikeStatesResponse>(
		uniqueIds.length > 0 ? buildLikeStateKey(uniqueIds) : null,
		fetchLikeStates,
		{
			revalidateOnFocus: false,
			revalidateIfStale: false,
			onSuccess: (data) => {
				if (uniqueIds.length === 1) return;
				for (const id of uniqueIds) {
					const state = data.states[String(id)];
					if (!state) continue;
					const key = buildLikeStateKey(id);
					mutate(key, { states: { [id]: state } }, false);
				}
			},
		},
	);

	return null;
}
