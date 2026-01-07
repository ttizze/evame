import { describe, expect, it } from "vitest";
import { computeNextLikeState } from "./like-state";

describe("like state helpers", () => {
	it("toggles like state and updates counts", () => {
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
