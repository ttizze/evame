import { describe, expect, it } from "vitest";
import { parseVoteForm } from "./action";
import { VOTE_TARGET } from "./constants";

describe("parseVoteForm", () => {
	it("should successfully parse valid form data", () => {
		const formData = new FormData();
		formData.append("segmentTranslationId", "123");
		formData.append("isUpvote", "true");
		formData.append("voteTarget", VOTE_TARGET.PAGE_SEGMENT_TRANSLATION);

		const result = parseVoteForm(formData);

		expect(result).toEqual({
			segmentTranslationId: 123,
			isUpvote: true,
			voteTarget: VOTE_TARGET.PAGE_SEGMENT_TRANSLATION,
		});
	});

	it("should handle false isUpvote value", () => {
		const formData = new FormData();
		formData.append("segmentTranslationId", "123");
		formData.append("isUpvote", "false");
		formData.append("voteTarget", VOTE_TARGET.COMMENT_SEGMENT_TRANSLATION);

		const result = parseVoteForm(formData);

		expect(result).toEqual({
			segmentTranslationId: 123,
			isUpvote: false,
			voteTarget: VOTE_TARGET.COMMENT_SEGMENT_TRANSLATION,
		});
	});

	it("should throw error for invalid segmentTranslationId", () => {
		const formData = new FormData();
		formData.append("segmentTranslationId", "invalid");
		formData.append("isUpvote", "true");
		formData.append("voteTarget", VOTE_TARGET.PAGE_SEGMENT_TRANSLATION);

		expect(() => parseVoteForm(formData)).toThrow();
	});

	it("should throw error for missing fields", () => {
		const formData = new FormData();
		formData.append("segmentTranslationId", "123");
		// Missing isUpvote and voteTarget

		expect(() => parseVoteForm(formData)).toThrow();
	});

	it("should throw error for invalid voteTarget", () => {
		const formData = new FormData();
		formData.append("segmentTranslationId", "123");
		formData.append("isUpvote", "true");
		formData.append("voteTarget", "invalid_target");

		expect(() => parseVoteForm(formData)).toThrow();
	});
});
