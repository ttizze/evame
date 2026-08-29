import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import useSWR from "swr";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import type { NotificationRowsWithRelations } from "@/app/api/notifications/_types/notification";
import { NotificationsDropdownClient } from "./client";

vi.mock("swr", () => ({ default: vi.fn() }));
vi.mock("@tanstack/react-router", () => ({
	Link: ({
		to,
		children,
		...props
	}: { to: string; children?: ReactNode } & Record<string, unknown>) => (
		<a href={to} {...props}>
			{children}
		</a>
	),
}));

const sampleNotifications: NotificationRowsWithRelations[] = [
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
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => Response.json({ success: true })),
		);
	});

	it("ベルアイコンと未読数バッジが表示される", () => {
		(useSWR as unknown as Mock).mockReturnValue({
			data: { notifications: sampleNotifications },
			isLoading: false,
			mutate: vi.fn(),
		});

		render(<NotificationsDropdownClient locale="en" />);

		expect(screen.getByTestId("bell-icon")).toBeInTheDocument();
		expect(screen.getByTestId("unread-count")).toHaveTextContent("2");
	});

	it("通知が存在しない場合は『No notifications』と表示される", async () => {
		(useSWR as unknown as Mock).mockReturnValue({
			data: { notifications: [] },
			isLoading: false,
			mutate: vi.fn(),
		});

		render(<NotificationsDropdownClient locale="en" />);

		await user.click(screen.getByTestId("bell-icon"));
		expect(screen.getByText("No notifications")).toBeInTheDocument();
	});

	it("各種通知の内容が正しく表示される", async () => {
		(useSWR as unknown as Mock).mockReturnValue({
			data: { notifications: sampleNotifications },
			isLoading: false,
			mutate: vi.fn(),
		});

		render(<NotificationsDropdownClient locale="en" />);

		await user.click(screen.getByTestId("bell-icon"));
		await waitFor(() => {
			expect(
				screen.getByTestId("notifications-menu-content"),
			).toBeInTheDocument();
		});

		expect(screen.getByText("Jane Doe")).toBeInTheDocument();
		expect(screen.getByText("Liked Page Title")).toBeInTheDocument();
		expect(screen.getByText(/liked your page/i)).toBeInTheDocument();
		expect(screen.getByText("Bob Smith")).toBeInTheDocument();
		expect(screen.getByText(/followed you/i)).toBeInTheDocument();
		expect(screen.getByText("Alice Jones")).toBeInTheDocument();
		expect(screen.getByText("Translation Text")).toBeInTheDocument();
		expect(screen.getByText("Translated Page Title")).toBeInTheDocument();
	});
});
