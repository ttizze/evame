import { fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import type { ReactNode } from "react";
import { vi } from "vitest";
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
		userHandle: "testuser",
		userName: "Test User",
		userImage: "/test-image.jpg",
	} as unknown as PageDetail;
	const tocItems = [
		{
			anchorId: "heading-1",
			level: 1,
			segment: {
				id: 1,
				contentId: 1,
				number: 1,
				text: "Heading 1",
				translationText: null,
			},
		},
	];

	beforeEach(() => {
		vi.clearAllMocks();
	});

	test("ユーザー情報が表示される", () => {
		render(
			<NuqsTestingAdapter>
				<NextIntlClientProvider locale="en">
					<SubHeader
						markdown="Hello"
						pageDetail={mockPageDetail}
						tocItems={[]}
					/>
				</NextIntlClientProvider>
			</NuqsTestingAdapter>,
		);

		expect(screen.getByText("Test User")).toBeInTheDocument();
		expect(screen.getByText("1/1/2023")).toBeInTheDocument();
	});

	test("TOCが空のときボタンが表示されない", () => {
		render(
			<NuqsTestingAdapter>
				<NextIntlClientProvider locale="en">
					<SubHeader
						markdown="Hello"
						pageDetail={mockPageDetail}
						tocItems={[]}
					/>
				</NextIntlClientProvider>
			</NuqsTestingAdapter>,
		);

		expect(screen.queryByTitle("Table of Contents")).not.toBeInTheDocument();
	});

	test("TOCがあるときボタンが表示される", () => {
		render(
			<NuqsTestingAdapter>
				<NextIntlClientProvider locale="en">
					<SubHeader
						markdown="Hello"
						pageDetail={mockPageDetail}
						tocItems={tocItems}
					/>
				</NextIntlClientProvider>
			</NuqsTestingAdapter>,
		);

		expect(screen.getByTitle("Table of Contents")).toBeInTheDocument();
	});

	test("TOCボタンのクリックで表示が切り替わる", () => {
		render(
			<NuqsTestingAdapter>
				<NextIntlClientProvider locale="en">
					<SubHeader
						markdown="Hello"
						pageDetail={mockPageDetail}
						tocItems={tocItems}
					/>
				</NextIntlClientProvider>
			</NuqsTestingAdapter>,
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
			<NuqsTestingAdapter>
				<NextIntlClientProvider locale="en">
					<SubHeader
						markdown="Hello"
						pageDetail={mockPageDetail}
						tocItems={tocItems}
					/>
				</NextIntlClientProvider>
			</NuqsTestingAdapter>,
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
