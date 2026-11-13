import type { LikeState } from "../src/app/api/page-likes/_types/like-state";

export function computeNextLikeState(current: LikeState): LikeState {
	return {
		liked: !current.liked,
		likeCount: current.likeCount + (current.liked ? -1 : 1),
	};
}
