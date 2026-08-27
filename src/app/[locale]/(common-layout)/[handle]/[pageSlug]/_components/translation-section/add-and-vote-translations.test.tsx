import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type {
	TranslationCandidate,
	VoteResult,
} from "@/components/scripture/types";
import { AddAndVoteTranslations } from "./add-and-vote-translations.client";

const candidate = (input: {
	id: string;
	text: string;
	ownedByViewer: boolean;
	voteCount: number;
}): TranslationCandidate => ({
	...input,
	locale: "en",
	votedByViewer: null,
	userName: input.id,
	userHandle: input.id,
	userProfile: "",
	userIsAi: false,
	userTotalPoints: input.voteCount,
});

const voteResult: VoteResult = { voted: null, voteCount: 0 };

const defaultProps = {
	authenticated: true,
	availableLocales: [{ code: "en", label: "English" }],
	defaultLocale: "en",
	locale: "en",
	onVote: vi.fn().mockResolvedValue(voteResult),
	open: true,
};

describe("originのadd-and-vote-translations", () => {
	it("best候補を削除すると残った候補が繰り上がり、追加フォームも残る", async () => {
		const user = userEvent.setup();
		const best = candidate({
			id: "best",
			text: "Best translation",
			ownedByViewer: true,
			voteCount: 10,
		});
		const alternative = candidate({
			id: "alternative",
			text: "Alternative translation",
			ownedByViewer: false,
			voteCount: 4,
		});
		const onDeleteTranslation = vi.fn().mockResolvedValue(undefined);

		render(
			<AddAndVoteTranslations
				{...defaultProps}
				onCreateTranslation={vi.fn().mockResolvedValue(best)}
				onDeleteTranslation={onDeleteTranslation}
				translations={[best, alternative]}
			/>,
		);

		await user.click(screen.getByRole("button", { name: "Delete" }));
		expect(onDeleteTranslation).toHaveBeenCalledWith("best");
		await waitFor(() =>
			expect(screen.queryByText("Best translation")).not.toBeInTheDocument(),
		);
		expect(screen.getByText("Alternative translation")).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Submit translation" }),
		).toBeInTheDocument();
	});

	it("候補が0件でも投稿フォームを表示し、投稿直後の候補を表示する", async () => {
		const user = userEvent.setup();
		const created = candidate({
			id: "created",
			text: "Created immediately",
			ownedByViewer: true,
			voteCount: 0,
		});
		const onCreateTranslation = vi.fn().mockResolvedValue(created);

		render(
			<AddAndVoteTranslations
				{...defaultProps}
				onCreateTranslation={onCreateTranslation}
				translations={[]}
			/>,
		);

		expect(
			screen.getByRole("button", { name: "Submit translation" }),
		).toBeInTheDocument();
		await user.type(screen.getByRole("textbox"), "Created immediately");
		await user.click(
			screen.getByRole("button", { name: "Submit translation" }),
		);

		await waitFor(() =>
			expect(screen.getByText("Created immediately")).toBeInTheDocument(),
		);
	});
});
