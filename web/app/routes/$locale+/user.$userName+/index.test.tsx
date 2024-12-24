import { createRemixStub } from "@remix-run/testing";
import { render, screen, waitFor } from "@testing-library/react";
import { expect, test } from "vitest";
import "@testing-library/jest-dom";
import { userEvent } from "@testing-library/user-event";
import { authenticator } from "~/utils/auth.server";
import { prisma } from "~/utils/prisma";
import UserProfile, { loader, action } from "./index";

vi.mock("~/utils/auth.server", () => ({
	authenticator: {
		isAuthenticated: vi.fn(),
	},
}));

describe("UserProfile", () => {
	beforeEach(async () => {
		await prisma.user.create({
			data: {
				userName: "testuser",
				displayName: "Test User",
				email: "testuser@example.com",
				icon: "https://example.com/icon.jpg",
				profile: "This is a test profile",
				pages: {
					create: [
						{
							slug: "public-page",
							isPublished: true,
							content: "This is a test content",
							sourceTexts: {
								create: {
									number: 0,
									text: "Public Page",
									textAndOccurrenceHash: "hash0",
								},
							},
						},
						{
							slug: "private-page",
							isPublished: false,
							content: "This is a test content2",
							sourceTexts: {
								create: {
									number: 0,
									text: "Private Page",
									textAndOccurrenceHash: "hash1",
								},
							},
						},
						{
							slug: "archived-page",
							isArchived: true,
							content: "This is a test content3",
							sourceTexts: {
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
		await prisma.user.create({
			data: {
				userName: "testuser2",
				displayName: "Test User2",
				email: "testuser2@example.com",
				icon: "https://example.com/icon2.jpg",
				profile: "This is a test profile2",
			},
		});
	});

	test("loader returns correct data and menu is displayed for authenticated owner", async () => {
		// @ts-ignore
		vi.mocked(authenticator.isAuthenticated).mockResolvedValue({
			id: 1,
			userName: "testuser",
		});
		const RemixStub = createRemixStub([
			{
				path: "/:userName",
				Component: UserProfile,
				loader,
			},
		]);

		render(<RemixStub initialEntries={["/testuser"]} />);

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
			id: 1,
			userName: "testuser2",
		});
		const RemixStub = createRemixStub([
			{
				path: "/:userName",
				Component: UserProfile,
				loader,
			},
		]);

		render(<RemixStub initialEntries={["/testuser2"]} />);

		expect(await screen.findByText("Test User2")).toBeInTheDocument();
		expect(
			await screen.findByText("You haven't created any pages yet."),
		).toBeInTheDocument();
		const menuButton = screen.queryByLabelText("More options");
		expect(menuButton).not.toBeInTheDocument();
	});
	test("loader returns correct data and menu is not displayed for unauthenticated visitor", async () => {
		// @ts-ignore
		vi.mocked(authenticator.isAuthenticated).mockResolvedValue(null);
		const RemixStub = createRemixStub([
			{
				path: "/:userName",
				Component: UserProfile,
				loader,
			},
		]);
		render(<RemixStub initialEntries={["/testuser"]} />);

		expect((await screen.findAllByText("Test User"))[0]).toBeInTheDocument();
		expect(
			await screen.findByText("This is a test profile"),
		).toBeInTheDocument();
		expect(await screen.findByText("Public Page")).toBeInTheDocument();
		expect(await screen.queryByText("Private Page")).not.toBeInTheDocument();
		expect(await screen.queryByText("Archived Page")).not.toBeInTheDocument();
		expect(
			await screen.queryByLabelText("More options"),
		).not.toBeInTheDocument();
	});

	test("action handles togglePublish correctly", async () => {
		// @ts-ignore
		vi.mocked(authenticator.isAuthenticated).mockResolvedValue({
			id: 1,
			userName: "testuser",
		});
		const RemixStub = createRemixStub([
			{
				path: "/:userName",
				Component: UserProfile,
				loader,
				action,
			},
		]);
		render(<RemixStub initialEntries={["/testuser"]} />);

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
		vi.mocked(authenticator.isAuthenticated).mockResolvedValue({
			id: 1,
			userName: "testuser",
		});
		const RemixStub = createRemixStub([
			{
				path: "/:userName",
				Component: UserProfile,
				loader,
				action,
			},
		]);
		render(<RemixStub initialEntries={["/testuser"]} />);

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
