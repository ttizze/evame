// NotificationsDropdownClient.test.tsx
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { NotificationsDropdownClient } from "./client";
import type { NotificationWithRelations } from "./db/queries.server";
import "@testing-library/jest-dom";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { getCurrentUser } from "@/auth";
import { mockUsers } from "@/tests/mock";

vi.mock("@/auth");
vi.mock("next/cache", () => ({
	revalidatePath: () => {},
}));
const sampleNotifications: NotificationWithRelations[] = [
	{
		id: 1,
		userId: "john_doe",
		actorId: "john_doe",
		pageId: null,
		pageCommentId: 1,
		pageSegmentTranslationId: null,
		pageCommentSegmentTranslationId: null,
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
				pageSegments: [{ text: "Commented Page Title" }],
			},
		},
		pageSegmentTranslation: null,
		pageCommentSegmentTranslation: null,
	},
	{
		id: 2,
		userId: "john_doe",
		actorId: "jane_doe",
		pageId: 1,
		pageCommentId: null,
		pageSegmentTranslationId: null,
		pageCommentSegmentTranslationId: null,
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
			pageSegments: [{ text: "Liked Page Title" }],
		},
		pageComment: null,
		pageSegmentTranslation: null,
		pageCommentSegmentTranslation: null,
	},
	{
		id: 3,
		userId: "john_doe",
		actorId: "bob_smith",
		pageId: null,
		pageCommentId: null,
		pageSegmentTranslationId: null,
		pageCommentSegmentTranslationId: null,
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
		pageSegmentTranslation: null,
		pageCommentSegmentTranslation: null,
	},
	{
		id: 4,
		userId: "john_doe",
		actorId: "alice_jones",
		pageId: null,
		pageCommentId: null,
		pageSegmentTranslationId: 1,
		pageCommentSegmentTranslationId: null,
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
		pageSegmentTranslation: {
			text: "Translation Text",
			pageSegment: {
				text: "Translation Text",
				page: {
					slug: "page-slug-translation",
					pageSegments: [{ text: "Translated Page Title" }],
					user: {
						handle: "user_of_page",
					},
				},
			},
		},
		pageCommentSegmentTranslation: null,
	},
];

const user = userEvent.setup();
describe("NotificationsDropdownClient", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(getCurrentUser).mockResolvedValue(mockUsers[0]);
	});

	it("ベルアイコンと未読数バッジが表示される", async () => {
		render(
			<NotificationsDropdownClient
				currentUserHandle={mockUsers[0].handle}
				notifications={sampleNotifications}
			/>,
		);

		// コンポーネント内の Bell アイコン (svg) を取得
		const bellIcon = screen.getByTestId("bell-icon");
		expect(bellIcon).toBeInTheDocument();

		// 未読通知は sampleNotifications のうち read が false の数 → 3 であるはず
		expect(screen.getByTestId("unread-count")).toBeInTheDocument();
		expect(screen.getByText("3")).toBeInTheDocument();
	});

	it("通知が存在しない場合は『No notifications』と表示される", async () => {
		render(
			<NotificationsDropdownClient
				currentUserHandle={mockUsers[0].handle}
				notifications={[]}
			/>,
		);

		// ドロップダウンのトリガー (Bell アイコン) をクリック
		const bellIcon = screen.getByTestId("bell-icon");
		expect(bellIcon).toBeInTheDocument();
		if (bellIcon) {
			await user.click(bellIcon);
		}

		// 通知がない場合のメッセージを検証
		expect(screen.getByText("No notifications")).toBeInTheDocument();
	});

	it("各種通知の内容が正しく表示される", async () => {
		render(
			<NextIntlClientProvider locale="ja">
				<NotificationsDropdownClient
					currentUserHandle={mockUsers[0].handle}
					notifications={sampleNotifications}
				/>
			</NextIntlClientProvider>,
		);

		// ドロップダウンを開くために Bell アイコンをクリック

		const bellIcon = screen.getByTestId("bell-icon");
		expect(bellIcon).toBeInTheDocument();
		if (bellIcon) {
			await user.click(bellIcon);
		}
		await waitFor(() => {
			expect(
				screen.getByTestId("notifications-menu-content"),
			).toBeInTheDocument();
		});
		expect(await screen.findByText("John Doe")).toBeInTheDocument();
		expect(await screen.findByText("Commented Page Title")).toBeInTheDocument();
		expect(await screen.findByText(/commented on/i)).toBeInTheDocument();

		// PAGE_LIKE の通知
		expect(await screen.findByText("Jane Doe")).toBeInTheDocument();
		expect(await screen.findByText("Liked Page Title")).toBeInTheDocument();
		expect(await screen.findByText(/liked your page/i)).toBeInTheDocument();

		// FOLLOW の通知
		expect(await screen.findByText("Bob Smith")).toBeInTheDocument();
		expect(await screen.findByText(/followed you/i)).toBeInTheDocument();

		// PAGE_SEGMENT_TRANSLATION_VOTE の通知
		expect(await screen.findByText("Alice Jones")).toBeInTheDocument();
		expect(await screen.findByText("Translation Text")).toBeInTheDocument();
		expect(
			await screen.findByText("Translated Page Title"),
		).toBeInTheDocument();
		expect(await screen.findByText(/voted for/i)).toBeInTheDocument();
	});
});
