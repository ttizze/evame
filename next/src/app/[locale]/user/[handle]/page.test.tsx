import { render, screen, waitFor } from "@testing-library/react";
import { expect, test } from "vitest";
import "@testing-library/jest-dom";
import { prisma } from "@/lib/prisma";
import type { User } from "@prisma/client";
import { userEvent } from "@testing-library/user-event";
import UserProfile from "./page";
vi.mock("~/utils/auth.server", () => ({
	authenticator: {
		isAuthenticated: vi.fn(),
	},
}));

describe("UserProfile", () => {
	let testUser: User;
	let testUser2: User;
	beforeEach(async () => {
		const createdUser = await prisma.user.create({
			data: {
				handle: "testuser",
				name: "Test User",
				image: "https://example.com/image.jpg",
				profile: "This is a test profile",
				email: "testuser@example.com",
				pages: {
					create: [
						{
							slug: "public-page",
							status: "PUBLIC",
							content: "This is a test content",
							pageSegments: {
								create: {
									number: 0,
									text: "Public Page",
									textAndOccurrenceHash: "hash0",
								},
							},
						},
						{
							slug: "private-page",
							status: "DRAFT",
							content: "This is a test content2",
							pageSegments: {
								create: {
									number: 0,
									text: "Private Page",
									textAndOccurrenceHash: "hash1",
								},
							},
						},
						{
							slug: "archived-page",
							status: "ARCHIVE",
							content: "This is a test content3",
							pageSegments: {
								create: {
									number: 0,
									text: "Archived Page",
									textAndOccurrenceHash: "hash2",
								},
							},
						},
					],
				},
			},
			include: { pages: true },
		});
		const createdUser2 = await prisma.user.create({
			data: {
				handle: "testuser2",
				name: "Test User2",
				image: "https://example.com/image2.jpg",
				profile: "This is a test profile2",
				email: "testuser2@example.com",
			},
		});
		testUser = createdUser;
		testUser2 = createdUser2;
	});

	afterEach(async () => {
		await prisma.user.delete({
			where: { id: testUser.id },
		});
		await prisma.user.delete({
			where: { id: testUser2.id },
		});
	});

	test("loader returns correct data and menu is displayed for authenticated owner", async () => {
		// @ts-ignore
		vi.mocked(session.user).id = testUser.id;

		render(
			<UserProfile
				params={{ handle: "testuser", locale: "en" }}
				searchParams={{ page: "1" }}
			/>,
		);

		await screen.debug();
		expect((await screen.findAllByText("Test User"))[0]).toBeInTheDocument();
		expect(
			await screen.findByText("This is a test profile"),
		).toBeInTheDocument();
		expect(await screen.findByText("Public Page")).toBeInTheDocument();
		const menuButtons = await screen.findAllByLabelText("More options");
		expect(menuButtons.length).toBeGreaterThan(0);

		await userEvent.click(menuButtons[0]);

		expect(await screen.findByText("Edit")).toBeInTheDocument();
		expect(await screen.findByText("Make Private")).toBeInTheDocument();
		expect(await screen.findByText("Delete")).toBeInTheDocument();
	});
	test("loader returns correct data and no pages message is displayed when user has no pages", async () => {
		// @ts-ignore
		vi.mocked(authenticator.isAuthenticated).mockResolvedValue({
			id: "1",
			handle: "testuser2",
		});

		render(
			<UserProfile
				params={{ handle: "testuser2", locale: "en" }}
				searchParams={{ page: "1" }}
			/>,
		);

		expect(await screen.findByText("Test User2")).toBeInTheDocument();
		expect(
			await screen.findByText("You haven't created any pages yet."),
		).toBeInTheDocument();
		const menuButton = screen.queryByLabelText("More options");
		expect(menuButton).not.toBeInTheDocument();
	});
	// test("loader returns correct data and menu is not displayed for unauthenticated visitor", async () => {
	// 	// @ts-ignore
	// 	vi.mocked(authenticator.isAuthenticated).mockResolvedValue(null);
	// 	const RemixStub = createRemixStub([
	// 		{
	// 			path: "/:locale/user/:handle",
	// 			Component: UserProfile,
	// 			loader,
	// 		},
	// 	]);
	// 	render(<RemixStub initialEntries={["/en/user/testuser"]} />);
	// 	await screen.debug();
	// 	expect((await screen.findAllByText("Test User"))[0]).toBeInTheDocument();
	// 	expect(
	// 		await screen.findByText("This is a test profile"),
	// 	).toBeInTheDocument();
	// 	expect(await screen.findByText("Public Page")).toBeInTheDocument();
	// 	expect(await screen.queryByText("Private Page")).not.toBeInTheDocument();
	// 	expect(await screen.queryByText("Archived Page")).not.toBeInTheDocument();
	// 	expect(
	// 		await screen.queryByLabelText("More options"),
	// 	).not.toBeInTheDocument();
	// });

	test("action handles togglePublish correctly", async () => {
		// @ts-ignore
		vi.mocked(session.user).id = testUser.id;
		render(
			<UserProfile
				params={{ handle: "testuser", locale: "en" }}
				searchParams={{ page: "1" }}
			/>,
		);

		const menuButtons = await screen.findAllByLabelText("More options");
		expect(menuButtons.length).toBeGreaterThan(0);
		await userEvent.click(menuButtons[0]);
		expect(await screen.findByText("Edit")).toBeInTheDocument();
		expect(await screen.findByText("Make Private")).toBeInTheDocument();
		await userEvent.click(await screen.findByText("Make Private"));

		// const menuButtons2 = await screen.findAllByLabelText("More options");
		// expect(menuButtons2.length).toBeGreaterThan(0);
		// await userEvent.click(menuButtons2[0]);
		// await screen.debug();
		// expect(await screen.findByText("Make Public")).toBeInTheDocument();
	});

	test("action handles archive correctly", async () => {
		// @ts-ignore
		vi.mocked(session.user).id = testUser.id;

		render(
			<UserProfile
				params={{ handle: "testuser", locale: "en" }}
				searchParams={{ page: "1" }}
			/>,
		);

		const menuButtons = await screen.findAllByLabelText("More options");
		expect(menuButtons.length).toBeGreaterThan(0);

		await userEvent.click(menuButtons[0]);

		expect(await screen.findByText("Delete")).toBeInTheDocument();
		await userEvent.click(await screen.findByText("Delete"));
		expect(
			await screen.findByText(
				"This action cannot be undone. Are you sure you want to delete this page?",
			),
		).toBeInTheDocument();

		await userEvent.click(await screen.findByText("Delete"));

		await waitFor(() => {
			expect(screen.queryByText("Test Page")).not.toBeInTheDocument();
		});
	});
});
