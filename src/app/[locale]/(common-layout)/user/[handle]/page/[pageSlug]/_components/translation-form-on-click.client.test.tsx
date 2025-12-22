import { fireEvent, render, screen } from "@testing-library/react";
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
				<button className="seg-tr" data-segment-id="123" type="button">
					open
				</button>
				<TranslationFormOnClick />
			</>,
		);

		await user.click(screen.getByText("open"));

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
				<div className="seg-tr">noop</div>
				<TranslationFormOnClick />
			</>,
		);

		await user.click(screen.getByText("noop"));
		expect(screen.queryByTestId("tr-ui")).toBeNull();
	});

	test("同じ段をもう一度クリックすると閉じる（toggle）", async () => {
		const user = userEvent.setup();
		render(
			<>
				<button className="seg-tr" data-segment-id="123" type="button">
					open
				</button>
				<TranslationFormOnClick />
			</>,
		);

		const target = screen.getByText("open");
		await user.click(target);
		expect(screen.getByTestId("tr-ui")).toBeInTheDocument();

		await user.click(target);
		expect(screen.queryByTestId("tr-ui")).toBeNull();
	});

	test("テキスト選択がある状態のクリックでは UI を開かない（コピーしやすさ優先）", async () => {
		const user = userEvent.setup();
		render(
			<>
				<button className="seg-tr" data-segment-id="123" type="button">
					open
				</button>
				<TranslationFormOnClick />
			</>,
		);

		const original = window.getSelection;
		window.getSelection = () =>
			({
				isCollapsed: false,
				toString: () => "selected",
			}) as unknown as Selection;

		await user.click(screen.getByText("open"));
		expect(screen.queryByTestId("tr-ui")).toBeNull();

		window.getSelection = original;
	});

	test("キーボード（Enter/Space）で UI を開ける", async () => {
		const user = userEvent.setup();
		const { container } = render(
			<>
				<button className="seg-tr" data-segment-id="123" type="button">
					open
				</button>
				<TranslationFormOnClick />
			</>,
		);

		await user.tab();
		const el = container.querySelector(
			"[data-segment-id='123']",
		) as HTMLElement | null;
		expect(el).not.toBeNull();
		fireEvent.keyDown(el as HTMLElement, { key: "Enter" });
		expect(screen.getByTestId("tr-ui")).toHaveTextContent("segment:123");
	});
});
