"use client";

import useSWR, { useSWRConfig } from "swr";
import { useHydrated } from "@/app/_hooks/use-hydrated";
import { authClient } from "@/app/[locale]/_service/auth-client";
import {
	buildLikeStateKey,
	fetchLikeStates,
	type LikeStatesResponse,
} from "./service/like-api";

type PageLikeListClientProps = {
	pageIds: number[];
};

export function PageLikeListClient({ pageIds }: PageLikeListClientProps) {
	const hydrated = useHydrated();
	const { data: session } = authClient.useSession();
	const isLoggedIn = hydrated && !!session;
	const { mutate } = useSWRConfig();

	const uniqueIds = Array.from(new Set(pageIds)).filter((id) => id > 0);
	const idsKey = uniqueIds.join(",");

	useSWR<LikeStatesResponse>(
		isLoggedIn && idsKey ? buildLikeStateKey(uniqueIds) : null,
		fetchLikeStates,
		{
			revalidateOnFocus: false,
			revalidateIfStale: false,
			onSuccess: (data) => {
				for (const id of uniqueIds) {
					const state = data.states[String(id)];
					if (!state) continue;
					const key = buildLikeStateKey(id);
					mutate(key, state, false);
				}
			},
		},
	);

	return null;
}
