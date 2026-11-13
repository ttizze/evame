import { describe, expect, it } from "vitest";
import { computeNextLikeState } from "./like-state";

describe("いいねの状態", () => {
	it("追加・解除に合わせて件数を増減する", () => {
		expect(computeNextLikeState({ liked: false, likeCount: 0 })).toEqual({
			liked: true,
			likeCount: 1,
		});
		expect(computeNextLikeState({ liked: true, likeCount: 2 })).toEqual({
			liked: false,
			likeCount: 1,
		});
	});
});
