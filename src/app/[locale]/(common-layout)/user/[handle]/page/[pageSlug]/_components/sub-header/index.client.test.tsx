import { fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import { vi } from "vitest";
import { DisplayProvider } from "@/app/_context/display-provider";
import type { PageDetail } from "@/app/[locale]/types";
import { SubHeader } from "./index.client";

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
			id: "heading-1",
			depth: 1,
			sourceText: "Heading 1",
			translatedText: null,
		},
	];

	beforeEach(() => {
		vi.clearAllMocks();
	});

	test("ユーザー情報が表示される", () => {
		render(
			<NextIntlClientProvider locale="en">
				<DisplayProvider>
					<SubHeader pageDetail={mockPageDetail} tocItems={[]} />
				</DisplayProvider>
			</NextIntlClientProvider>,
		);

		expect(screen.getByText("Test User")).toBeInTheDocument();
		expect(screen.getByText("1/1/2023")).toBeInTheDocument();
	});

	test("TOCが空のときボタンが表示されない", () => {
		render(
			<NextIntlClientProvider locale="en">
				<DisplayProvider>
					<SubHeader pageDetail={mockPageDetail} tocItems={[]} />
				</DisplayProvider>
			</NextIntlClientProvider>,
		);

		expect(screen.queryByTitle("Table of Contents")).not.toBeInTheDocument();
	});

	test("TOCがあるときボタンが表示される", () => {
		render(
			<NextIntlClientProvider locale="en">
				<DisplayProvider>
					<SubHeader pageDetail={mockPageDetail} tocItems={tocItems} />
				</DisplayProvider>
			</NextIntlClientProvider>,
		);

		expect(screen.getByTitle("Table of Contents")).toBeInTheDocument();
	});

	test("TOCボタンのクリックで表示が切り替わる", () => {
		render(
			<NextIntlClientProvider locale="en">
				<DisplayProvider>
					<SubHeader pageDetail={mockPageDetail} tocItems={tocItems} />
				</DisplayProvider>
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

	test("原文リンクをクリックしてもTOCは閉じない", () => {
		render(
			<NextIntlClientProvider locale="en">
				<DisplayProvider>
					<SubHeader pageDetail={mockPageDetail} tocItems={tocItems} />
				</DisplayProvider>
			</NextIntlClientProvider>,
		);

		// Open the TOC
		fireEvent.click(screen.getByTitle("Table of Contents"));
		expect(screen.getByTestId("toc")).toBeInTheDocument();

		// Click a TOC item
		fireEvent.click(screen.getByRole("link", { name: "Heading 1" }));

		// TOC should remain visible
		expect(screen.getByTestId("toc")).toBeInTheDocument();
	});
});
