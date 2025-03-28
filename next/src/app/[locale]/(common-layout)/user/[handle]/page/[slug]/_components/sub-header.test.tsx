import type { PageWithTranslations } from "@/app/[locale]/types";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { vi } from "vitest";
import { SubHeader } from "./sub-header";
import * as TocModule from "./toc";

// Mock the dependencies
vi.mock("@/i18n/routing", () => ({
	Link: ({
		children,
		...props
	}: { children: ReactNode; href: string; className?: string }) => (
		<a {...props}>{children}</a>
	),
}));

interface TocProps {
	onItemClick: () => void;
}

vi.mock("./toc", () => ({
	__esModule: true,
	default: ({ onItemClick }: TocProps) => (
		<div
			data-testid="toc"
			onClick={onItemClick}
			onKeyUp={onItemClick}
			onKeyDown={onItemClick}
			onKeyPress={onItemClick}
		>
			Table of Contents
		</div>
	),
	useHasTableOfContents: vi.fn(),
}));

describe("SubHeader", () => {
	const mockPageWithTranslations = {
		user: {
			handle: "testuser",
			name: "Test User",
			image: "/test-image.jpg",
		},
		page: {
			createdAt: "2023-01-01",
			slug: "test-page",
			title: "Test Page",
			content: "Test content",
			translations: [],
		},
	} as unknown as PageWithTranslations;

	beforeEach(() => {
		vi.clearAllMocks();
	});

	test("renders user information correctly", () => {
		vi.mocked(TocModule.useHasTableOfContents).mockReturnValue(false);

		render(<SubHeader pageWithTranslations={mockPageWithTranslations} />);

		expect(screen.getByText("Test User")).toBeInTheDocument();
		expect(screen.getByText("2023-01-01")).toBeInTheDocument();
	});

	test("does not render TOC button when no TOC content", () => {
		vi.mocked(TocModule.useHasTableOfContents).mockReturnValue(false);

		render(<SubHeader pageWithTranslations={mockPageWithTranslations} />);

		expect(screen.queryByTitle("Table of Contents")).not.toBeInTheDocument();
	});

	test("renders TOC button when TOC content exists", () => {
		vi.mocked(TocModule.useHasTableOfContents).mockReturnValue(true);

		render(<SubHeader pageWithTranslations={mockPageWithTranslations} />);

		expect(screen.getByTitle("Table of Contents")).toBeInTheDocument();
	});

	test("toggles TOC visibility when TOC button is clicked", () => {
		vi.mocked(TocModule.useHasTableOfContents).mockReturnValue(true);

		render(<SubHeader pageWithTranslations={mockPageWithTranslations} />);

		// TOC should not be visible initially
		expect(screen.queryByTestId("toc")).not.toBeInTheDocument();

		// Click the TOC button
		fireEvent.click(screen.getByTitle("Table of Contents"));

		// TOC should now be visible
		expect(screen.getByTestId("toc")).toBeInTheDocument();

		// Click the TOC button again
		fireEvent.click(screen.getByTitle("Table of Contents"));

		// TOC should be hidden again
		expect(screen.queryByTestId("toc")).not.toBeInTheDocument();
	});

	test("closes TOC when a TOC item is clicked", () => {
		vi.mocked(TocModule.useHasTableOfContents).mockReturnValue(true);

		render(<SubHeader pageWithTranslations={mockPageWithTranslations} />);

		// Open the TOC
		fireEvent.click(screen.getByTitle("Table of Contents"));
		expect(screen.getByTestId("toc")).toBeInTheDocument();

		// Click a TOC item
		fireEvent.click(screen.getByTestId("toc"));

		// TOC should be hidden
		expect(screen.queryByTestId("toc")).not.toBeInTheDocument();
	});
});
