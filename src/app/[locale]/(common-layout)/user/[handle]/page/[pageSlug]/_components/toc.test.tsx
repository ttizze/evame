import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import TableOfContents from "./toc";

describe("TableOfContents", () => {
	const mockOnItemClick = vi.fn();
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
		vi.resetAllMocks();
	});

	it("should render the TOC container", () => {
		const { getByTestId } = render(
			<TableOfContents items={items} onItemClick={mockOnItemClick} />,
		);
		expect(getByTestId("toc")).toBeTruthy();
	});

	it("should call onItemClick when TOC item is clicked", async () => {
		const { getByRole } = render(
			<TableOfContents items={items} onItemClick={mockOnItemClick} />,
		);
		const tocLink = getByRole("link", { name: /Heading 1/ });
		tocLink.click();
		expect(mockOnItemClick).toHaveBeenCalledTimes(1);
	});

	it("should truncate long heading text", () => {
		const { getByText } = render(
			<TableOfContents items={items} onItemClick={mockOnItemClick} />,
		);
		expect(
			getByText("This is a very long heading text that sh..."),
		).toBeInTheDocument();
	});
});
