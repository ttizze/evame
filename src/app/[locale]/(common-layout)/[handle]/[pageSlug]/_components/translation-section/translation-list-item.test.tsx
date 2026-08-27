import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { TranslationCandidate } from "@/components/scripture/types";
import { TranslationListItem } from "./translation-list-item/client";

const translation: TranslationCandidate = {
	id: "translation-1",
	locale: "en",
	text: "A faithful translation",
	voteCount: 3,
	votedByViewer: null,
	userName: "Reader",
	userHandle: "reader",
	userProfile: "",
	userIsAi: false,
	userTotalPoints: 3,
	ownedByViewer: true,
};

describe("originのtranslation-list-item削除操作", () => {
	it("メニューを開く操作では削除せず、削除項目のクリックだけを実行する", async () => {
		const user = userEvent.setup();
		const onDeleteTranslation = vi.fn().mockResolvedValue(undefined);

		render(
			<TranslationListItem
				authenticated={true}
				locale="en"
				onDeleteTranslation={onDeleteTranslation}
				onVote={vi.fn()}
				translation={translation}
			/>,
		);

		await user.click(screen.getByRole("button", { name: "Delete" }));
		expect(onDeleteTranslation).not.toHaveBeenCalled();

		await user.click(screen.getByRole("menuitem", { name: "Delete" }));
		expect(onDeleteTranslation).toHaveBeenCalledWith("translation-1");
	});
});
