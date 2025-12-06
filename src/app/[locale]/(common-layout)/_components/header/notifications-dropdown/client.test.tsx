// NotificationsDropdownClient.test.tsx
import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
// Mock SWR to control data and loading states per test
import useSWR from "swr";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import { mockUsers } from "@/tests/mock";
import { NotificationsDropdownClient } from "./client";
import type { NotificationWithRelations } from "./db/queries.server";

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
const sampleNotifications: NotificationWithRelations[] = [
	{
		id: 1,
		userId: "john_doe",
		actorId: "john_doe",
		pageId: null,
		pageCommentId: 1,
		segmentTranslationId: null,
		read: false,
		createdAt: new Date("2023-01-01T00:00:00Z"),
		type: "PAGE_COMMENT",
		user: {
			handle: "john_doe",
			image: "https://example.com/avatar1.png",
			name: "John Doe",
		},
		actor: {
			handle: "john_doe",
			image: "https://example.com/avatar1.png",
			name: "John Doe",
		},
		page: null,
		pageComment: {
			page: {
				slug: "page-slug-comment",
				content: {
					segments: [{ text: "Commented Page Title" }],
				},
			},
		},
		segmentTranslation: null,
	},
	{
		id: 2,
		userId: "john_doe",
		actorId: "jane_doe",
		pageId: 1,
		pageCommentId: null,
		segmentTranslationId: null,
		read: true,
		createdAt: new Date("2023-01-02T00:00:00Z"),
		type: "PAGE_LIKE",
		user: {
			handle: "john_doe",
			image: "https://example.com/avatar1.png",
			name: "John Doe",
		},
		actor: {
			handle: "jane_doe",
			image: "https://example.com/avatar2.png",
			name: "Jane Doe",
		},
		page: {
			slug: "page-slug-like",
			content: {
				segments: [{ text: "Liked Page Title" }],
			},
		},
		pageComment: null,
		segmentTranslation: null,
	},
	{
		id: 3,
		userId: "john_doe",
		actorId: "bob_smith",
		pageId: null,
		pageCommentId: null,
		segmentTranslationId: null,
		read: false,
		createdAt: new Date("2023-01-03T00:00:00Z"),
		type: "FOLLOW",
		user: {
			handle: "john_doe",
			image: "https://example.com/avatar1.png",
			name: "John Doe",
		},
		actor: {
			handle: "bob_smith",
			image: "https://example.com/avatar3.png",
			name: "Bob Smith",
		},
		page: null,
		pageComment: null,
		segmentTranslation: null,
	},
	{
		id: 4,
		userId: "john_doe",
		actorId: "alice_jones",
		pageId: null,
		pageCommentId: null,
		segmentTranslationId: 1,
		read: false,
		createdAt: new Date("2023-01-04T00:00:00Z"),
		type: "PAGE_SEGMENT_TRANSLATION_VOTE",
		user: {
			handle: "john_doe",
			image: "https://example.com/avatar1.png",
			name: "John Doe",
		},
		actor: {
			handle: "alice_jones",
			image: "https://example.com/avatar4.png",
			name: "Alice Jones",
		},
		page: null,
		pageComment: null,
		segmentTranslation: {
			text: "Translation Text",
			segment: {
				text: "Translation Text",
				content: {
					page: {
						slug: "page-slug-translation",
						content: {
							segments: [{ text: "Translated Page Title" }],
						},
						user: {
							handle: "user_of_page",
						},
					},
				},
			},
		},
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
