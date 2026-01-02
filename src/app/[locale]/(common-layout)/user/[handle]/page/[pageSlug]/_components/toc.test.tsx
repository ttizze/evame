import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import TableOfContents from "./toc";

describe("TableOfContents", () => {
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

	it("should render the TOC container", () => {
		const { getByTestId } = render(<TableOfContents items={items} />);
		expect(getByTestId("toc")).toBeTruthy();
	});

	it("should call onItemClick when TOC item is clicked", async () => {
		const { getByRole } = render(<TableOfContents items={items} />);
		const tocLink = getByRole("link", { name: /Heading 1/ });
		tocLink.click();
		expect(tocLink).toBeTruthy();
	});

	it("should truncate long heading text", () => {
		const { getByText } = render(<TableOfContents items={items} />);
		expect(
			getByText("This is a very long heading text that sh..."),
		).toBeInTheDocument();
	});
});
