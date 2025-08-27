// selectBestTranslation.spec.ts
import { selectBestTranslation } from "@/app/[locale]/_lib/select-best-translation";
import type { TranslationWithInfo } from "@/app/[locale]/types";

test("choose by upvote, then point", () => {
	const t1 = {
		point: 10,
		currentUserVote: null,
		createdAt: "2024",
	} as unknown as TranslationWithInfo;
	const t2 = {
		point: 5,
		currentUserVote: { isUpvote: true, updatedAt: "..." },
		createdAt: "2025",
	} as unknown as TranslationWithInfo;
	const best = selectBestTranslation([t1, t2]);
	expect(best).toBe(t2);
});
