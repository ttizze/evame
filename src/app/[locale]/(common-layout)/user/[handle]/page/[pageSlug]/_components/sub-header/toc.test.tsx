import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Toc from "./toc";

describe("Toc", () => {
	const items = [
		{
			id: "heading-1",
			depth: 1,
			sourceText: "Heading 1",
			translatedText: "見出し1",
		},
		{
			id: "this-is-a-very-long-heading-text-that-should-be-truncated",
			depth: 2,
			sourceText: "This is a very long heading text that should be truncated",
			translatedText: null,
		},
	];

	beforeEach(() => {
		document.body.innerHTML = `
			<div class="js-content">
				<h2 data-number-id="1" class="seg-src">Heading 1</h2>
			</div>
		`;
		Object.defineProperty(window, "scrollTo", {
			value: vi.fn(),
			writable: true,
		});
	});

	afterEach(() => {
		cleanup();
	});

	it("TOCのコンテナが描画される", () => {
		const { getByTestId } = render(<Toc items={items} />);
		expect(getByTestId("toc")).toBeTruthy();
	});

	it("見出しリンクをクリックできる", async () => {
		const { getByRole } = render(<Toc items={items} />);
		const tocLink = getByRole("link", { name: /Heading 1/ });
		tocLink.click();
		expect(tocLink).toBeTruthy();
	});

	it("長い見出しが省略表示される", () => {
		const { getByText } = render(<Toc items={items} />);
		expect(
			getByText("This is a very long heading text that sh..."),
		).toBeInTheDocument();
	});
});
