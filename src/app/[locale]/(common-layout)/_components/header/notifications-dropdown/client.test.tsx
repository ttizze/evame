// NotificationsDropdownClient.test.tsx
import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import useSWR from "swr";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";
// Mock SWR to control data and loading states per test
import { mockUsers } from "@/tests/mock";
import { NotificationsDropdownClient } from "./client";
import type { NotificationRowsWithRelations } from "./db/queries.server";

vi.mock("swr", () => ({ default: vi.fn() }));

// Mock the action to avoid triggering real server code
vi.mock("./action", () => ({
	markNotificationAsReadAction: vi.fn(async () => ({ success: true })),
}));

// Mock routing's Link to a simple anchor to avoid Next/intl runtime
vi.mock("@/i18n/routing", () => ({
	Link: ({
		href,
		children,
		...props
	}: { href: string; children?: ReactNode } & Record<string, unknown>) => (
		<a href={href} {...props}>
			{children}
		</a>
	),
}));

// Keep next/cache mocked if any code path references it
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
const sampleNotifications: NotificationRowsWithRelations[] = [
	{
		id: 1,
		actorId: "actor_1",
		actorHandle: "john_doe",
		actorName: "John Doe",
		actorImage: "https://example.com/avatar1.png",
		read: false,
		createdAt: new Date("2023-01-01T00:00:00Z"),
		type: "PAGE_COMMENT",
		pageSlug: "page-slug-comment",
		pageOwnerHandle: "page_owner",
		pageTitle: "Commented Page Title",
		segmentTranslationText: null,
	},
	{
		id: 2,
		actorId: "actor_2",
		actorHandle: "jane_doe",
		actorName: "Jane Doe",
		actorImage: "https://example.com/avatar2.png",
		read: true,
		createdAt: new Date("2023-01-02T00:00:00Z"),
		type: "PAGE_LIKE",
		pageSlug: "page-slug-like",
		pageOwnerHandle: "john_doe",
		pageTitle: "Liked Page Title",
		segmentTranslationText: null,
	},
	{
		id: 3,
		actorId: "actor_3",
		actorHandle: "bob_smith",
		actorName: "Bob Smith",
		actorImage: "https://example.com/avatar3.png",
		read: false,
		createdAt: new Date("2023-01-03T00:00:00Z"),
		type: "FOLLOW",
		pageSlug: null,
		pageOwnerHandle: null,
		pageTitle: null,
		segmentTranslationText: null,
	},
	{
		id: 4,
		actorId: "actor_4",
		actorHandle: "alice_jones",
		actorName: "Alice Jones",
		actorImage: "https://example.com/avatar4.png",
		read: false,
		createdAt: new Date("2023-01-04T00:00:00Z"),
		type: "PAGE_SEGMENT_TRANSLATION_VOTE",
		segmentTranslationText: "Translation Text",
		pageSlug: "page-slug-translation",
		pageOwnerHandle: "user_of_page",
		pageTitle: "Translated Page Title",
	},
];

const user = userEvent.setup();

describe("NotificationsDropdownClient", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("ベルアイコンと未読数バッジが表示される", async () => {
		(useSWR as unknown as Mock).mockReturnValue({
			data: { notifications: sampleNotifications },
			isLoading: false,
			mutate: vi.fn(),
		});

		render(
			<NotificationsDropdownClient currentUserHandle={mockUsers[0].handle} />,
		);

		// Bell icon is visible
		const bellIcon = screen.getByTestId("bell-icon");
		expect(bellIcon).toBeInTheDocument();

		// Unread count equals 3 (id:1,3,4 are unread)
		const unreadBadge = screen.getByTestId("unread-count");
		expect(unreadBadge).toBeInTheDocument();
		expect(unreadBadge).toHaveTextContent("3");
	});

	it("通知が存在しない場合は『No notifications』と表示される", async () => {
		(useSWR as unknown as Mock).mockReturnValue({
			data: { notifications: [] },
			isLoading: false,
			mutate: vi.fn(),
		});

		render(
			<NotificationsDropdownClient currentUserHandle={mockUsers[0].handle} />,
		);

		const bellIcon = screen.getByTestId("bell-icon");
		expect(bellIcon).toBeInTheDocument();
		await user.click(bellIcon);

		// The empty state message should be shown
		expect(screen.getByText("No notifications")).toBeInTheDocument();
	});

	it("各種通知の内容が正しく表示される", async () => {
		(useSWR as unknown as Mock).mockReturnValue({
			data: { notifications: sampleNotifications },
			isLoading: false,
			mutate: vi.fn(),
		});

		render(
			<NotificationsDropdownClient currentUserHandle={mockUsers[0].handle} />,
		);

		const bellIcon = screen.getByTestId("bell-icon");
		expect(bellIcon).toBeInTheDocument();
		await user.click(bellIcon);

		await waitFor(() => {
			expect(
				screen.getByTestId("notifications-menu-content"),
			).toBeInTheDocument();
		});

		// PAGE_COMMENT
		expect(await screen.findByText("John Doe")).toBeInTheDocument();
		expect(await screen.findByText("Commented Page Title")).toBeInTheDocument();
		expect(await screen.findByText(/commented on/i)).toBeInTheDocument();

		// PAGE_LIKE
		expect(await screen.findByText("Jane Doe")).toBeInTheDocument();
		expect(await screen.findByText("Liked Page Title")).toBeInTheDocument();
		expect(await screen.findByText(/liked your page/i)).toBeInTheDocument();

		// FOLLOW
		expect(await screen.findByText("Bob Smith")).toBeInTheDocument();
		expect(await screen.findByText(/followed you/i)).toBeInTheDocument();

		// PAGE_SEGMENT_TRANSLATION_VOTE
		expect(await screen.findByText("Alice Jones")).toBeInTheDocument();
		expect(await screen.findByText("Translation Text")).toBeInTheDocument();
		expect(
			await screen.findByText("Translated Page Title"),
		).toBeInTheDocument();
		expect(await screen.findByText(/voted for/i)).toBeInTheDocument();
	});
});
