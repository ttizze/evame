import { beforeEach, expect, it, vi } from "vitest";
import { getCurrentUserFromHeaders } from "@/app/_service/current-user";
import { getLocaleFromHtml } from "@/app/[locale]/_domain/get-locale-from-html";
import { enqueueTranslationJob } from "@/app/[locale]/_infrastructure/qstash/enqueue-translation-job.server";
import { commentAction } from "@/app/api/reader-actions/_service/add-comment";
import { db } from "@/db";
import { toSessionUser } from "@/tests/auth-helpers";
import { resetDatabase } from "@/tests/db-helpers";
import { createPage, createPageComment, createUser } from "@/tests/factories";
import { setupDbPerFile } from "@/tests/test-db-manager";

vi.mock("@/app/_service/current-user", () => ({
	getCurrentUserFromHeaders: vi.fn(),
}));
vi.mock("@/app/[locale]/_domain/get-locale-from-html", () => ({
	getLocaleFromHtml: vi.fn().mockResolvedValue("ja"),
}));
vi.mock(
	"@/app/[locale]/_infrastructure/qstash/enqueue-translation-job.server",
	() => ({ enqueueTranslationJob: vi.fn().mockResolvedValue([]) }),
);
await setupDbPerFile(import.meta.url);
beforeEach(async () => {
	await resetDatabase();
	vi.mocked(getLocaleFromHtml).mockReset().mockResolvedValue("ja");
	vi.mocked(enqueueTranslationJob).mockReset().mockResolvedValue([]);
});

it.each([false, true])(
	"本文の変換中に受付OFFが完了したら新規保存・通知・翻訳を止める（返信=%s）",
	async (reply) => {
		const owner = await createUser();
		const user = await createUser();
		const page = await createPage({
			userId: owner.id,
			slug: "comments-close-during-processing",
		});
		const root = await createPageComment({ userId: user.id, pageId: page.id });
		vi.mocked(getCurrentUserFromHeaders).mockResolvedValue(toSessionUser(user));
		vi.mocked(getLocaleFromHtml).mockImplementationOnce(async () => {
			await db
				.updateTable("pages")
				.set({ commentsEnabled: false })
				.where("id", "=", page.id)
				.execute();
			return "ja";
		});
		const result = await commentAction(
			{
				pageId: page.id,
				userLocale: "ja",
				content: "<p>同時投稿</p>",
				...(reply ? { parentId: root.id } : {}),
			},
			new Headers(),
		);
		expect(result).toMatchObject({
			success: false,
			message: "COMMENTS_CLOSED",
		});
		expect(
			await db
				.selectFrom("pageComments")
				.select("id")
				.where("pageId", "=", page.id)
				.execute(),
		).toEqual([{ id: root.id }]);
		expect(
			await db.selectFrom("notifications").select("id").execute(),
		).toHaveLength(0);
		expect(enqueueTranslationJob).not.toHaveBeenCalled();
	},
);

it.each([false, true])(
	"受付OFFでは新規コメント・返信を保存せず通知と翻訳も作らない（返信=%s）",
	async (reply) => {
		const owner = await createUser();
		const user = await createUser();
		const page = await createPage({
			userId: owner.id,
			slug: "comments-disabled",
		});
		const root = await createPageComment({ userId: user.id, pageId: page.id });
		await db
			.updateTable("pages")
			.set({ commentsEnabled: false })
			.where("id", "=", page.id)
			.execute();
		vi.mocked(getCurrentUserFromHeaders).mockResolvedValue(toSessionUser(user));
		expect(
			await commentAction(
				{
					pageId: page.id,
					userLocale: "ja",
					content: "<p>受付停止後の投稿</p>",
					...(reply ? { parentId: root.id } : {}),
				},
				new Headers(),
			),
		).toMatchObject({ success: false, message: "COMMENTS_CLOSED" });
		expect(
			await db
				.selectFrom("pageComments")
				.select("id")
				.where("pageId", "=", page.id)
				.execute(),
		).toEqual([{ id: root.id }]);
		expect(
			await db.selectFrom("notifications").select("id").execute(),
		).toHaveLength(0);
		expect(enqueueTranslationJob).not.toHaveBeenCalled();
	},
);

it("受付OFFでも自分の既存コメントは更新できる", async () => {
	const user = await createUser();
	const page = await createPage({
		userId: user.id,
		slug: "closed-comment-edit",
	});
	const comment = await createPageComment({ userId: user.id, pageId: page.id });
	await db
		.updateTable("pages")
		.set({ commentsEnabled: false })
		.where("id", "=", page.id)
		.execute();
	vi.mocked(getCurrentUserFromHeaders).mockResolvedValue(toSessionUser(user));
	expect(
		await commentAction(
			{
				pageId: page.id,
				pageCommentId: comment.id,
				userLocale: "ja",
				contentFormat: "markdown",
				content: "自分のコメントを更新",
			},
			new Headers(),
		),
	).toMatchObject({ success: true });
	expect(
		await db
			.selectFrom("pageComments")
			.select("id")
			.where("pageId", "=", page.id)
			.execute(),
	).toEqual([{ id: comment.id }]);
});

it("LexicalのMarkdownコメントをGFMとして保存し、既存の翻訳ジョブへ渡す", async () => {
	const user = await createUser();
	const page = await createPage({
		userId: user.id,
		slug: "markdown-comment-page",
	});
	vi.mocked(getCurrentUserFromHeaders).mockResolvedValue(toSessionUser(user));
	const result = await commentAction(
		{
			pageId: page.id,
			userLocale: "ja",
			content: "~~コメント~~\n\n- [x] 完了",
			contentFormat: "markdown",
		},
		new Headers(),
	);
	expect(result.success).toBe(true);
	const stored = await db
		.selectFrom("pageComments")
		.select(["id", "mdastJson"])
		.where("pageId", "=", page.id)
		.executeTakeFirstOrThrow();
	expect(stored.mdastJson).toMatchObject({
		children: [
			{ type: "paragraph", children: [{ type: "delete" }] },
			{ type: "list", children: [{ checked: true }] },
		],
	});
	expect(enqueueTranslationJob).toHaveBeenCalledWith(
		expect.objectContaining({ pageId: page.id, pageCommentId: stored.id }),
	);
});

it("21件目の新規コメントを投稿すると表示先の2ページ目を返す", async () => {
	const user = await createUser();
	const page = await createPage({ userId: user.id, slug: "new-comment-page" });
	for (let index = 0; index < 20; index++)
		await createPageComment({ userId: user.id, pageId: page.id });
	vi.mocked(getCurrentUserFromHeaders).mockResolvedValue(toSessionUser(user));
	expect(
		await commentAction(
			{
				pageId: page.id,
				userLocale: "ja",
				content: "<p>新しいコメント</p>",
			},
			new Headers(),
		),
	).toMatchObject({ success: true, data: { commentPage: 2 } });
});

it("返信を投稿すると現在のコメントページを維持する", async () => {
	const user = await createUser();
	const page = await createPage({
		userId: user.id,
		slug: "reply-current-page",
	});
	const root = await createPageComment({ userId: user.id, pageId: page.id });
	vi.mocked(getCurrentUserFromHeaders).mockResolvedValue(toSessionUser(user));
	expect(
		await commentAction(
			{
				pageId: page.id,
				userLocale: "ja",
				parentId: root.id,
				content: "<p>返信コメント</p>",
			},
			new Headers(),
		),
	).toMatchObject({ success: true, data: { commentPage: null } });
});

it("同時に後続のコメントが投稿されても自分のコメントのページを返す", async () => {
	const user = await createUser();
	const page = await createPage({
		userId: user.id,
		slug: "concurrent-comment-page",
	});
	for (let index = 0; index < 19; index++)
		await createPageComment({ userId: user.id, pageId: page.id });
	vi.mocked(getCurrentUserFromHeaders).mockResolvedValue(toSessionUser(user));
	vi.mocked(enqueueTranslationJob).mockImplementationOnce(async () => {
		const later = await createPageComment({ userId: user.id, pageId: page.id });
		await db
			.updateTable("pageComments")
			.set({ createdAt: new Date(Date.now() + 10000) })
			.where("id", "=", later.id)
			.execute();
		return [];
	});
	expect(
		await commentAction(
			{
				pageId: page.id,
				userLocale: "ja",
				content: "<p>20件目のコメント</p>",
			},
			new Headers(),
		),
	).toMatchObject({ success: true, data: { commentPage: 1 } });
});
