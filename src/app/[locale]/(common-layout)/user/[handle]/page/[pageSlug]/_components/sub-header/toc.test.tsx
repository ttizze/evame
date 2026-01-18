import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Toc from "./toc";

describe("Toc", () => {
	const items = [
		{
			anchorId: "heading-1",
			level: 1,
			segment: {
				id: 1,
				contentId: 1,
				number: 1,
				text: "Heading 1",
				translationText: "見出し1",
			},
		},
		{
			anchorId: "this-is-a-very-long-heading-text-that-should-be-truncated",
			level: 2,
			segment: {
				id: 2,
				contentId: 1,
				number: 2,
				text: "This is a very long heading text that should be truncated",
				translationText: null,
			},
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

	it("見出しリンクが存在する", () => {
		const { getByRole } = render(<Toc items={items} />);
		const tocLink = getByRole("link", { name: /Heading 1/ });
		expect(tocLink).toHaveAttribute("href", "#heading-1");
	});

	it("長い見出しが表示される", () => {
		const { getByText } = render(<Toc items={items} />);
		expect(
			getByText("This is a very long heading text that should be truncated"),
		).toBeInTheDocument();
	});
});
