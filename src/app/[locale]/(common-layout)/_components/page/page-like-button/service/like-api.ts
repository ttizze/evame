import type {
	LikeState,
	LikeStatesResponse,
} from "@/app/api/page-likes/_types/like-state";

export type { LikeState, LikeStatesResponse };

export const buildLikeStateKey = (ids: number[] | number) => {
	const list = Array.isArray(ids) ? ids : [ids];
	return `/api/page-likes/state?ids=${list.join(",")}`;
};

export const fetchLikeStates = (url: string) =>
	fetch(url, { credentials: "include" }).then((r) => {
		if (!r.ok) throw new Error("failed");
		return r.json() as Promise<LikeStatesResponse>;
	});
