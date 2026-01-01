import { fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import { vi } from "vitest";
import type { PageDetail } from "@/app/[locale]/types";
import { SubHeader } from "./sub-header";

// Mock the dependencies
vi.mock("@/i18n/routing", () => ({
	Link: ({
		children,
		...props
	}: {
		children: ReactNode;
		href: string;
		className?: string;
	}) => <a {...props}>{children}</a>,
}));

interface TocProps {
	items: Array<{
		number: number;
		depth: number;
		sourceText: string;
		translatedText: string | null;
	}>;
	onItemClick: () => void;
}

vi.mock("./toc", () => ({
	__esModule: true,
	default: ({ onItemClick }: TocProps) => (
		<button
			data-testid="toc"
			onClick={onItemClick}
			onKeyDown={onItemClick}
			onKeyUp={onItemClick}
			type="button"
		>
			Table of Contents
		</button>
	),
}));

describe("SubHeader", () => {
	const mockPageDetail = {
		createdAt: new Date("2023-01-01T00:00:00.000Z"),
		slug: "test-page",
		title: "Test Page",
		content: "Test content",
		translations: [],
		user: {
			handle: "testuser",
			name: "Test User",
			image: "/test-image.jpg",
		},
	} as unknown as PageDetail;
	const tocItems = [
		{
			number: 1,
			depth: 1,
			sourceText: "Heading 1",
			translatedText: null,
		},
	];

	beforeEach(() => {
		vi.clearAllMocks();
	});

	test("renders user information correctly", () => {
		render(
			<NextIntlClientProvider locale="en">
				<SubHeader pageDetail={mockPageDetail} tocItems={[]} />
			</NextIntlClientProvider>,
		);

		expect(screen.getByText("Test User")).toBeInTheDocument();
		expect(screen.getByText("1/1/2023")).toBeInTheDocument();
	});

	test("does not render TOC button when no TOC content", () => {
		render(
			<NextIntlClientProvider locale="en">
				<SubHeader pageDetail={mockPageDetail} tocItems={[]} />
			</NextIntlClientProvider>,
		);

		expect(screen.queryByTitle("Table of Contents")).not.toBeInTheDocument();
	});

	test("renders TOC button when TOC content exists", () => {
		render(
			<NextIntlClientProvider locale="en">
				<SubHeader pageDetail={mockPageDetail} tocItems={tocItems} />
			</NextIntlClientProvider>,
		);

		expect(screen.getByTitle("Table of Contents")).toBeInTheDocument();
	});

	test("toggles TOC visibility when TOC button is clicked", () => {
		render(
			<NextIntlClientProvider locale="en">
				<SubHeader pageDetail={mockPageDetail} tocItems={tocItems} />
			</NextIntlClientProvider>,
		);

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
		render(
			<NextIntlClientProvider locale="en">
				<SubHeader pageDetail={mockPageDetail} tocItems={tocItems} />
			</NextIntlClientProvider>,
		);

		// Open the TOC
		fireEvent.click(screen.getByTitle("Table of Contents"));
		expect(screen.getByTestId("toc")).toBeInTheDocument();

		// Click a TOC item
		fireEvent.click(screen.getByTestId("toc"));

		// TOC should be hidden
		expect(screen.queryByTestId("toc")).not.toBeInTheDocument();
	});
});
