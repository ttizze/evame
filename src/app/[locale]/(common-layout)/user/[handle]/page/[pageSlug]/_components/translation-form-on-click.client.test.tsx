import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TranslationFormOnClick } from "./translation-form-on-click.client";

vi.mock(
	"@/app/[locale]/(common-layout)/_components/wrap-segments/translation-section/add-and-vote-translations.client",
	() => ({
		AddAndVoteTranslations: ({ segmentId }: { segmentId: number }) => (
			<div data-testid="tr-ui">segment:{segmentId}</div>
		),
	}),
);

describe("TranslationFormOnClick", () => {
	test("data-segment-id のクリックで、その段のUIだけが開く（イベント委譲）", async () => {
		const user = userEvent.setup();
		const { container } = render(
			<>
				<div className="seg-tr">
					<button data-segment-id="123" type="button">
						open
					</button>
				</div>
				<TranslationFormOnClick />
			</>,
		);

		await user.click(screen.getByRole("button", { name: "open" }));

		expect(screen.getByTestId("tr-ui")).toHaveTextContent("segment:123");

		const block = container.querySelector(".seg-tr");
		expect(block).not.toBeNull();
		const root = block?.nextElementSibling as HTMLElement | null;
		expect(root?.dataset.trFormRoot).toBe("1");
	});

	test("data-segment-id 以外をクリックしてもUIは開かない", async () => {
		const user = userEvent.setup();
		render(
			<>
				<div className="seg-tr">
					<button type="button">noop</button>
				</div>
				<TranslationFormOnClick />
			</>,
		);

		await user.click(screen.getByRole("button", { name: "noop" }));
		expect(screen.queryByTestId("tr-ui")).toBeNull();
	});

	test("同じ段をもう一度クリックすると閉じる（toggle）", async () => {
		const user = userEvent.setup();
		render(
			<>
				<div className="seg-tr">
					<button data-segment-id="123" type="button">
						open
					</button>
				</div>
				<TranslationFormOnClick />
			</>,
		);

		const btn = screen.getByRole("button", { name: "open" });
		await user.click(btn);
		expect(screen.getByTestId("tr-ui")).toBeInTheDocument();

		await user.click(btn);
		expect(screen.queryByTestId("tr-ui")).toBeNull();
	});
});
