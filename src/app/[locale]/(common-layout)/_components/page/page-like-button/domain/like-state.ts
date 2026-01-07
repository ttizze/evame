import type { LikeState } from "../service/like-api";

export function computeNextLikeState(current: LikeState): LikeState {
	return {
		liked: !current.liked,
		likeCount: current.likeCount + (current.liked ? -1 : 1),
	};
}
