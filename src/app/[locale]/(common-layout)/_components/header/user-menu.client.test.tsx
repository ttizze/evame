import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SWRConfig } from "swr";
import { IntlProvider } from "use-intl";
import { beforeEach, expect, it, vi } from "vitest";
import { messages } from "@/i18n/messages";
import { UserMenu } from "./user-menu.client";

const notifications = [
	{
		id: 1,
		actorId: "actor1",
		actorHandle: "jane",
		actorName: "Jane Doe",
		actorImage: "",
		read: true,
		createdAt: "2023-01-02T00:00:00Z",
		type: "PAGE_LIKE",
		pageSlug: "liked",
		pageOwnerHandle: "alice",
		pageTitle: "Liked Page Title",
		segmentTranslationText: null,
	},
	{
		id: 2,
		actorId: "actor2",
		actorHandle: "bob",
		actorName: "Bob Smith",
		actorImage: "",
		read: false,
		createdAt: "2023-01-03T00:00:00Z",
		type: "FOLLOW",
		pageSlug: null,
		pageOwnerHandle: null,
		pageTitle: null,
		segmentTranslationText: null,
	},
	{
		id: 3,
		actorId: "actor3",
		actorHandle: "translator",
		actorName: "Translator",
		actorImage: "",
		read: false,
		createdAt: "2023-01-04T00:00:00Z",
		type: "PAGE_SEGMENT_TRANSLATION_VOTE",
		pageSlug: "translation",
		pageOwnerHandle: "alice",
		pageTitle: "Translated Page Title",
		segmentTranslationText: "Translation Text",
	},
	{
		id: 4,
		actorId: "actor4",
		actorHandle: "commenter",
		actorName: "Commenter",
		actorImage: "",
		read: false,
		createdAt: "2023-01-05T00:00:00Z",
		type: "PAGE_COMMENT",
		pageSlug: "commented",
		pageOwnerHandle: "alice",
		pageTitle: "Commented Page Title",
		segmentTranslationText: null,
	},
	{
		id: 5,
		actorId: "actor5",
		actorHandle: "voter",
		actorName: "Comment Translation Voter",
		actorImage: "",
		read: false,
		createdAt: "2023-01-06T00:00:00Z",
		type: "PAGE_COMMENT_SEGMENT_TRANSLATION_VOTE",
		pageSlug: "comment-translation",
		pageOwnerHandle: "alice",
		pageTitle: "Comment Translation Page Title",
		segmentTranslationText: "Comment Translation Text",
	},
];

function renderMenu() {
	return render(
		<IntlProvider locale="ja" messages={messages.ja}>
			<SWRConfig
				value={{ provider: () => new Map(), shouldRetryOnError: false }}
			>
				<UserMenu
					currentUser={{
						handle: "alice",
						name: "Alice",
						image: "",
						plan: "free",
					}}
					locale="ja"
				/>
			</SWRConfig>
		</IntlProvider>,
	);
}

beforeEach(() => {
	vi.stubGlobal(
		"fetch",
		vi.fn(async (_url: string, init: RequestInit | undefined) =>
			init?.method === "POST"
				? Response.json({ success: true })
				: Response.json({ notifications }),
		),
	);
});

it("アバターに未読数を表示し、アカウントメニューを開くだけでは既読にしない", async () => {
	const user = userEvent.setup();
	renderMenu();
	const account = screen.getByRole("button", { name: "アカウントメニュー" });
	await waitFor(() =>
		expect(account).toHaveAccessibleDescription("未読通知4件"),
	);
	await user.click(account);
	expect(screen.getByRole("menuitem", { name: "通知" })).toBeVisible();
	expect(
		vi.mocked(fetch).mock.calls.filter(([, init]) => init?.method === "POST"),
	).toHaveLength(0);
});

it("メニューの通知を開くと全種類の通知と記事へのリンクを表示し、既読になったバッジを消す", async () => {
	const user = userEvent.setup();
	renderMenu();
	await screen.findByText("未読通知4件");
	await user.click(screen.getByRole("button", { name: "アカウントメニュー" }));
	await user.click(screen.getByRole("menuitem", { name: "通知" }));
	for (const title of [
		"Liked Page Title",
		"Bob Smith",
		"Translated Page Title",
		"Commented Page Title",
		"Comment Translation Page Title",
	]) {
		expect(await screen.findByText(title)).toBeVisible();
	}
	expect(
		screen.getByRole("link", { name: "Liked Page Title" }),
	).toHaveAttribute("href", "/ja/alice/liked");
	expect(screen.getByText("Translation Text")).toBeVisible();
	expect(screen.getByText("Comment Translation Text")).toBeVisible();
	expect(screen.getAllByText(/UTC$/)).toHaveLength(5);
	await waitFor(() => expect(screen.queryByText("未読通知4件")).toBeNull());
	expect(fetch).toHaveBeenCalledWith("/api/notifications", {
		method: "POST",
		credentials: "include",
	});
});

it("通知がないときは空の表示を出す", async () => {
	vi.mocked(fetch).mockImplementation(async () =>
		Response.json({ notifications: [] }),
	);
	const user = userEvent.setup();
	renderMenu();
	await user.click(screen.getByRole("button", { name: "アカウントメニュー" }));
	await user.click(screen.getByRole("menuitem", { name: "通知" }));
	expect(await screen.findByText("通知はありません")).toBeVisible();
});

it("使い方を開いても通知を既読にせず、Escapeで説明を閉じてメニューへ戻れる", async () => {
	const user = userEvent.setup();
	renderMenu();
	await screen.findByText("未読通知4件");
	await user.click(screen.getByRole("button", { name: "アカウントメニュー" }));
	await user.click(screen.getByRole("menuitem", { name: "使い方" }));
	expect(
		await screen.findByRole("dialog", { name: "使い方" }),
	).toHaveTextContent("原文と翻訳を縦に並べて読めます");
	await user.keyboard("{Escape}");
	expect(screen.queryByRole("dialog", { name: "使い方" })).toBeNull();
	expect(screen.getByRole("menuitem", { name: "通知" })).toBeVisible();
	expect(
		vi.mocked(fetch).mock.calls.filter(([, init]) => init?.method === "POST"),
	).toHaveLength(0);
});

it("既読処理が失敗したときは未読バッジを消さず、通知を開き直して再試行できる", async () => {
	let failed = true;
	vi.mocked(fetch).mockImplementation(async (_url, init) => {
		if (init?.method === "POST")
			return Response.json({}, { status: failed ? 500 : 200 });
		return Response.json({ notifications });
	});
	const user = userEvent.setup();
	renderMenu();
	await screen.findByText("未読通知4件");
	await user.click(screen.getByRole("button", { name: "アカウントメニュー" }));
	await user.click(screen.getByRole("menuitem", { name: "通知" }));
	await screen.findByText("Bob Smith");
	expect(screen.getByText("未読通知4件")).toBeInTheDocument();
	await user.keyboard("{Escape}");
	failed = false;
	await user.click(screen.getByRole("button", { name: "アカウントメニュー" }));
	await user.click(screen.getByRole("menuitem", { name: "通知" }));
	await waitFor(() => expect(screen.queryByText("未読通知4件")).toBeNull());
});

it("通知の読み込みに失敗しても既読にせず、メニュー内の再試行で内容を表示できる", async () => {
	let failed = true;
	vi.mocked(fetch).mockImplementation(async (_url, init) =>
		init?.method === "POST"
			? Response.json({ success: true })
			: failed
				? Response.json({}, { status: 500 })
				: Response.json({ notifications }),
	);
	const user = userEvent.setup();
	renderMenu();
	await user.click(screen.getByRole("button", { name: "アカウントメニュー" }));
	await user.click(screen.getByRole("menuitem", { name: "通知" }));
	await screen.findByRole("menuitem", {
		name: "通知を読み込めませんでした。再試行",
	});
	expect(
		vi.mocked(fetch).mock.calls.filter(([, init]) => init?.method === "POST"),
	).toHaveLength(0);
	failed = false;
	await user.click(
		screen.getByRole("menuitem", {
			name: "通知を読み込めませんでした。再試行",
		}),
	);
	expect(await screen.findByText("Bob Smith")).toBeVisible();
	await waitFor(() => expect(screen.queryByText("未読通知4件")).toBeNull());
	expect(fetch).toHaveBeenCalledWith("/api/notifications", {
		method: "POST",
		credentials: "include",
	});
});

it("読み込み中に通知を開いても、取得して表示できた通知を既読にする", async () => {
	let finishLoading = () => {};
	const loading = new Promise<void>((resolve) => {
		finishLoading = resolve;
	});
	vi.mocked(fetch).mockImplementation(async (_url, init) => {
		if (init?.method === "POST") return Response.json({ success: true });
		await loading;
		return Response.json({ notifications });
	});
	const user = userEvent.setup();
	renderMenu();
	await user.click(screen.getByRole("button", { name: "アカウントメニュー" }));
	await user.click(screen.getByRole("menuitem", { name: "通知" }));
	expect(await screen.findByText("通知を読み込み中…")).toBeVisible();
	expect(
		vi.mocked(fetch).mock.calls.filter(([, init]) => init?.method === "POST"),
	).toHaveLength(0);
	finishLoading();
	expect(await screen.findByText("Bob Smith")).toBeVisible();
	await waitFor(() => expect(screen.queryByText("未読通知4件")).toBeNull());
	expect(fetch).toHaveBeenCalledWith("/api/notifications", {
		method: "POST",
		credentials: "include",
	});
});

it("ユーザーメニューのテーマ項目をEnterで選ぶとメニューを閉じる", async () => {
	const user = userEvent.setup();
	renderMenu();
	await user.click(screen.getByRole("button", { name: "アカウントメニュー" }));
	const themeItem = screen.getByRole("menuitem", {
		name: "テーマ変更",
	});
	themeItem.focus();
	await user.keyboard("{Enter}");
	expect(screen.queryByRole("menuitem", { name: "通知" })).toBeNull();
});

it("通知一覧から戻ると同じメニュー内に設定と使い方を表示する", async () => {
	const user = userEvent.setup();
	renderMenu();
	await user.click(screen.getByRole("button", { name: "アカウントメニュー" }));
	await user.click(screen.getByRole("menuitem", { name: "通知" }));
	await screen.findByText("Bob Smith");
	await user.click(
		screen.getByRole("menuitem", { name: "アカウントメニューに戻る" }),
	);
	expect(screen.getByRole("menuitem", { name: "使い方" })).toBeVisible();
	expect(
		screen.getByRole("menuitem", { name: "プロフィール・設定" }),
	).toBeVisible();
	expect(screen.queryByText("Bob Smith")).toBeNull();
});

it("言語選択をログアウトのすぐ上に表示する", async () => {
	const user = userEvent.setup();
	renderMenu();
	await user.click(screen.getByRole("button", { name: "アカウントメニュー" }));
	const language = screen.getByRole("button", { name: "日本語" });
	const logout = screen.getByRole("menuitem", { name: "Log out" });
	expect(
		[...screen.getByRole("menu").querySelectorAll("button")].slice(-2),
	).toEqual([language, logout]);
});
