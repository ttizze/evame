import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { IntlProvider } from "use-intl";
import { expect, it, vi } from "vitest";
import type { PageCommentsData } from "@/app/api/_service/load-page-comments";
import { messages } from "@/i18n/messages";
import { CommentsIsland } from "./comments";

vi.mock("nuqs", async (importOriginal) => ({
	...(await importOriginal<typeof import("nuqs")>()),
	useQueryState: () => [1, vi.fn()],
}));
vi.mock("swr", () => ({
	default: (
		_key: unknown,
		_fetcher: unknown,
		options: { fallbackData: PageCommentsData },
	) => ({ data: options.fallbackData, mutate: vi.fn(), isLoading: false }),
}));
vi.mock("./providers", () => ({
	IslandProviders: ({ children }: { children: ReactNode }) => (
		<IntlProvider locale="ja" messages={messages.ja}>
			{children}
		</IntlProvider>
	),
}));
vi.mock(
	"@/app/[locale]/(common-layout)/[handle]/[pageSlug]/_components/comment/_components/page-comment-form/client",
	() => ({ PageCommentForm: () => <form aria-label="新規コメント" /> }),
);
vi.mock(
	"@/app/[locale]/(common-layout)/[handle]/[pageSlug]/_components/comment/_components/page-comment-list/server",
	() => ({ PageCommentList: () => <p>既存コメントの本文</p> }),
);

it.each([true, false, undefined])(
	"受付状態=%sで既存コメントを表示し、旧Gatewayの応答では受付ONを維持する",
	async (commentsEnabled) => {
		const initialData = {
			comments: [
				{
					id: 1,
					pageId: 1,
					userId: "owner",
					parentId: null,
					locale: "ja",
					mdastJson: {},
					createdAt: new Date("2026-01-01T00:00:00Z"),
					updatedAt: new Date("2026-01-01T00:00:00Z"),
					isDeleted: false,
					lastReplyAt: null,
					replyCount: 0,
					user: { handle: "owner", name: "Owner", image: "" },
					content: { segments: [] },
					replies: [],
				},
			],
			count: 1,
			totalPages: 1,
			...(commentsEnabled === undefined ? {} : { commentsEnabled }),
		} as PageCommentsData;
		render(
			<CommentsIsland
				initialData={initialData}
				initialList={<p>配信済みコメント</p>}
				initialPage={1}
				locale="ja"
				pageId={1}
				pathname="/ja/owner/page"
				search=""
			/>,
		);
		expect((await screen.findByText("既存コメントの本文")).textContent).toBe(
			"既存コメントの本文",
		);
		if (commentsEnabled === false) {
			expect(screen.queryByRole("form", { name: "新規コメント" })).toBeNull();
			expect(screen.getByRole("status").textContent).toContain(
				"コメントの受付を停止しています。",
			);
		} else
			expect(
				screen.queryByRole("form", { name: "新規コメント" }),
			).not.toBeNull();
	},
);
