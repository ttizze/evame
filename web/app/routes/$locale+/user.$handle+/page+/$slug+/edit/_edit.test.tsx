import { createRemixStub } from "@remix-run/testing";
import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import "@testing-library/jest-dom";
import { authenticator } from "~/utils/auth.server";
import { prisma } from "~/utils/prisma";
import EditPage, { loader } from "./_edit";
vi.mock("~/utils/auth.server", () => ({
	authenticator: {
		isAuthenticated: vi.fn(),
	},
}));
vi.mock("./components/editor/EditorBubbleMenu", () => ({
	EditorBubbleMenu: vi.fn(() => (
		<div data-testid="mocked-editor-bubble-menu">Mocked EditorBubbleMenu</div>
	)),
}));
vi.mock("./components/editor/EditorFloatingMenu", () => ({
	EditorFloatingMenu: vi.fn(() => (
		<div data-testid="mocked-editor-floating-menu">
			Mocked EditorFloatingMenu
		</div>
	)),
}));
describe("EditPage", () => {
	function getBoundingClientRect(): DOMRect {
		const rec = {
			x: 0,
			y: 0,
			bottom: 0,
			height: 0,
			left: 0,
			right: 0,
			top: 0,
			width: 0,
		};
		return { ...rec, toJSON: () => rec };
	}

	class FakeDOMRectList extends Array<DOMRect> implements DOMRectList {
		item(index: number): DOMRect | null {
			return this[index];
		}
	}

	document.elementFromPoint = (): null => null;
	HTMLElement.prototype.getBoundingClientRect = getBoundingClientRect;
	HTMLElement.prototype.getClientRects = (): DOMRectList =>
		new FakeDOMRectList();
	Range.prototype.getBoundingClientRect = getBoundingClientRect;
	Range.prototype.getClientRects = (): DOMRectList => new FakeDOMRectList();
	let sourceTextIds: number[];
	beforeEach(async () => {
		const user = await prisma.user.create({
			data: {
				handle: "testuser",
				name: "Test User",
				image: "https://example.com/image.jpg",
				profile: "This is a test profile",
				pages: {
					create: [
						{
							slug: "test-page",
							status: "DRAFT",
							content:
								"<p data-number='1'>hello</p><p data-number='2'>world</p><p data-number='3'>This is a test content</p>",
							sourceTexts: {
								create: [
									{
										number: 0,
										text: "Test Title",
										textAndOccurrenceHash: "hash0",
									},
									{ number: 1, text: "hello", textAndOccurrenceHash: "hash1" },
									{ number: 2, text: "world", textAndOccurrenceHash: "hash2" },
									{
										number: 3,
										text: "This is a test content",
										textAndOccurrenceHash: "hash3",
									},
								],
							},
						},
					],
				},
			},
			include: { pages: { include: { sourceTexts: true } } },
		});

		const page = user.pages[0];
		sourceTextIds = page.sourceTexts.map((st) => st.id);
		const updatedContent = page.content.replace(
			/<p data-number='(\d+)'>/g,
			(match, number) => {
				const sourceText = page.sourceTexts.find(
					(st) => st.number === Number.parseInt(number),
				);
				return `<p data-number='${number}' data-number-id='${sourceText?.id}'>`;
			},
		);

		await prisma.page.update({
			where: { id: page.id },
			data: { content: updatedContent },
		});
	});

	test("loader returns correct data for authenticated user", async () => {
		// @ts-ignore
		vi.mocked(authenticator.isAuthenticated).mockResolvedValue({
			id: 1,
			handle: "testuser",
		});

		const RemixStub = createRemixStub([
			{
				path: "/:handle/page/:slug/edit",
				Component: EditPage,
				loader,
			},
		]);

		render(<RemixStub initialEntries={["/testuser/page/test-page/edit"]} />);

		expect(await screen.findByText("Test Title")).toBeInTheDocument();
		expect(
			await screen.findByText("This is a test content"),
		).toBeInTheDocument();
	});

	// test("action handles form submission correctly", async () => {
	// 	// @ts-ignore
	// 	vi.mocked(authenticator.isAuthenticated).mockResolvedValue({
	// 		id: 1,
	// 		handle: "testuser",
	// 	});

	// 	const RemixStub = createRemixStub([
	// 		{
	// 			path: "/:handle/page/:slug/edit",
	// 			Component: EditPage,
	// 			loader,
	// 			action,
	// 		},
	// 	]);

	// 	render(<RemixStub initialEntries={["/testuser/page/test-page/edit"]} />);
	// 	const firstParagraph = await screen.findByText("hello");
	// 	await userEvent.type(firstParagraph, "updated ");
	// 	await userEvent.keyboard("{enter}");

	// 	await userEvent.click(await screen.findByTestId("change-publish-button"));
	// 	await userEvent.click(await screen.findByTestId("public-button"));
	// 	await userEvent.click(await screen.findByTestId("save-button"));

	// 	expect(await screen.findByTestId("save-button-check")).toBeInTheDocument();

	// 	await waitFor(async () => {
	// 		const updatedPage = await prisma.page.findFirst({
	// 			where: { slug: "test-page" },
	// 			include: { sourceTexts: { orderBy: { number: "asc" } } },
	// 		});
	// 		console.log(updatedPage?.sourceTexts);
	// 		expect(updatedPage).not.toBeNull();
	// 		expect(updatedPage?.sourceTexts).toHaveLength(5);
	// 		for (const id of sourceTextIds) {
	// 			expect(updatedPage?.sourceTexts.some((st) => st.id === id)).toBe(true);
	// 		}

	// 		expect(updatedPage?.sourceTexts[0].text).toBe("Test Title");
	// 		expect(updatedPage?.sourceTexts[1].text).toBe("updated");
	// 		expect(updatedPage?.sourceTexts[1].id).toBe(sourceTextIds[1]);
	// 		expect(updatedPage?.sourceTexts[2].text).toBe("hello");
	// 		expect(updatedPage?.sourceTexts[3].id).toBe(sourceTextIds[2]);
	// 		expect(updatedPage?.sourceTexts[3].text).toBe("world");
	// 		expect(updatedPage?.sourceTexts[4].id).toBe(sourceTextIds[3]);
	// 		expect(updatedPage?.sourceTexts[4].text).toBe("This is a test content");
	// 	});
	// });
});
