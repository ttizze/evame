import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { TranslationCandidate } from "@/components/scripture/types";
import { AddTranslationForm } from "./add-translation-form/client";

const createdTranslation: TranslationCandidate = {
	id: "translation-created",
	locale: "en",
	text: "The newly submitted translation",
	voteCount: 0,
	votedByViewer: null,
	userName: "Reader",
	userHandle: "reader",
	userProfile: "",
	userIsAi: false,
	userTotalPoints: 0,
	ownedByViewer: true,
};

describe("originのadd-translation-form", () => {
	it("投稿結果を親へ返し、親が候補一覧へ追加できる", async () => {
		const user = userEvent.setup();
		const onCreateTranslation = vi.fn().mockResolvedValue(createdTranslation);
		const onTranslationAdded = vi.fn();

		render(
			<AddTranslationForm
				authenticated={true}
				availableLocales={[{ code: "en", label: "English" }]}
				defaultLocale="en"
				onCreateTranslation={onCreateTranslation}
				onTranslationAdded={onTranslationAdded}
				uiLocale="en"
			/>,
		);

		await user.type(screen.getByRole("textbox"), createdTranslation.text);
		await user.click(
			screen.getByRole("button", { name: "Submit translation" }),
		);

		expect(onCreateTranslation).toHaveBeenCalledWith({
			locale: "en",
			text: createdTranslation.text,
		});
		expect(onTranslationAdded).toHaveBeenCalledWith(createdTranslation);
	});
});
