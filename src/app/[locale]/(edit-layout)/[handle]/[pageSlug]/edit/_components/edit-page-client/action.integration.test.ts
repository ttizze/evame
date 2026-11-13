import { setResponseHeader } from "@tanstack/react-start/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentUserFromHeaders } from "@/app/_service/current-user";
import { db } from "@/db";
import { toSessionUser } from "@/tests/auth-helpers";
import { resetDatabase } from "@/tests/db-helpers";
import { createPage, createUser } from "@/tests/factories";
import { setupDbPerFile } from "@/tests/test-db-manager";
import { editPageContent } from "./action";

vi.mock("@/app/_service/current-user", () => ({
	getCurrentUserFromHeaders: vi.fn(),
}));
vi.mock("@tanstack/react-start", () => ({
	createServerFn: () => {
		const builder = {
			validator: () => builder,
			handler: <T>(handler: T) => handler,
		};
		return builder;
	},
}));
vi.mock("@tanstack/react-start/server", () => ({
	getRequestHeaders: () => new Headers(),
	setResponseHeader: vi.fn(),
}));

await setupDbPerFile(import.meta.url);

describe("editPageContent", () => {
	it("Markdownの本文をすべて削除してもタイトルを残して保存できる", async () => {
		const user = await createUser();
		const page = await createPage({ userId: user.id, slug: "empty-body" });
		vi.mocked(getCurrentUserFromHeaders).mockResolvedValue(toSessionUser(user));
		const form = new FormData();
		form.set("pageSlug", page.slug);
		form.set("title", "タイトルだけの文書");
		form.set("userLocale", "ja");
		form.set("contentFormat", "markdown");
		form.set("pageContent", "");
		expect((await editPageContent({ data: form })).success).toBe(true);
		expect(
			(
				await db
					.selectFrom("pages")
					.select("mdastJson")
					.where("id", "=", page.id)
					.executeTakeFirstOrThrow()
			).mdastJson,
		).toMatchObject({ type: "root", children: [] });
	});
	beforeEach(async () => {
		await resetDatabase();
		vi.clearAllMocks();
	});

	it("無効な入力データが渡された場合、バリデーションエラーを返す", async () => {
		const formData = new FormData();
		formData.set("pageSlug", "");
		formData.set("title", "");
		formData.set("userLocale", "en");
		formData.set("pageContent", "");

		const result = await editPageContent({ data: formData });

		expect(result.success).toBe(false);
		expect(!result.success && result.zodErrors).toBeDefined();
	});

	it("所有者が有効な入力データを送信すると既存ページを保存する", async () => {
		const user = await createUser();
		const page = await createPage({ userId: user.id, slug: "test-page" });
		vi.mocked(getCurrentUserFromHeaders).mockResolvedValue(toSessionUser(user));

		const formData = new FormData();
		formData.set("pageSlug", page.slug);
		formData.set("title", "Updated Title");
		formData.set("userLocale", "en");
		formData.set("pageContent", "<p>Updated content</p>");

		const result = await editPageContent({ data: formData });

		expect(result).toEqual({ success: true, data: { pageId: page.id } });
		const updatedPage = await db
			.selectFrom("pages")
			.selectAll()
			.where("id", "=", page.id)
			.executeTakeFirst();
		expect(updatedPage?.slug).toBe(page.slug);
	});

	it.each(["", " \r\n\t "])(
		"タイトルが空白だけならuntitledとして保存し、本文は維持する（%j）",
		async (title) => {
			const user = await createUser();
			const page = await createPage({ userId: user.id, slug: "untitled-page" });
			vi.mocked(getCurrentUserFromHeaders).mockResolvedValue(
				toSessionUser(user),
			);
			const form = new FormData();
			form.set("pageSlug", page.slug);
			form.set("title", title);
			form.set("userLocale", "ja");
			form.set("contentFormat", "markdown");
			form.set("pageContent", "本文を残す");
			expect((await editPageContent({ data: form })).success).toBe(true);
			const segments = await db
				.selectFrom("segments")
				.select(["number", "text"])
				.where("contentId", "=", page.id)
				.orderBy("number")
				.execute();
			expect(segments).toMatchObject([
				{ number: 0, text: "untitled" },
				{ number: 1, text: "本文を残す" },
			]);
		},
	);

	it("所有者が未作成のslugを保存すると新規ページを作成する", async () => {
		const user = await createUser();
		vi.mocked(getCurrentUserFromHeaders).mockResolvedValue(toSessionUser(user));

		const formData = new FormData();
		formData.set("pageSlug", "new-page");
		formData.set("title", "New Page");
		formData.set("userLocale", "en");
		formData.set("pageContent", "<p>New content</p>");

		const result = await editPageContent({ data: formData });

		expect(result.success).toBe(true);
		expect(setResponseHeader).toHaveBeenCalledWith(
			"X-Evame-Reader-Changed",
			"false",
		);
		const createdPage = await db
			.selectFrom("pages")
			.select(["id", "slug", "userId", "status"])
			.where("slug", "=", "new-page")
			.executeTakeFirstOrThrow();
		expect(createdPage).toEqual({
			id: expect.any(Number),
			slug: "new-page",
			userId: user.id,
			status: "DRAFT",
		});
		expect(result).toEqual({ success: true, data: { pageId: createdPage.id } });
	});

	it("タイトルに改行が混ざっていても保存時に空白へ正規化する", async () => {
		const user = await createUser();
		const page = await createPage({ userId: user.id, slug: "test-page" });
		vi.mocked(getCurrentUserFromHeaders).mockResolvedValue(toSessionUser(user));

		const formData = new FormData();
		formData.set("pageSlug", page.slug);
		formData.set("title", "Hello\nWorld");
		formData.set("userLocale", "en");
		formData.set("pageContent", "<p>Updated content</p>");

		const result = await editPageContent({ data: formData });
		expect(result.success).toBe(true);

		const titleSegment = await db
			.selectFrom("segments")
			.select(["text"])
			.where("contentId", "=", page.id)
			.where("number", "=", 0)
			.executeTakeFirstOrThrow();
		expect(titleSegment.text).toBe("Hello World");
	});

	it("認証されていないユーザーが保存するとログインへリダイレクトする", async () => {
		vi.mocked(getCurrentUserFromHeaders).mockResolvedValue(null);
		const formData = new FormData();
		formData.set("pageSlug", "test-page");
		formData.set("title", "Test Title");
		formData.set("userLocale", "en");
		formData.set("pageContent", "<p>Test content</p>");

		await expect(editPageContent({ data: formData })).rejects.toBeDefined();
	});

	it("Markdownで保存したGFMを保ち、段落追加後も既存段落の翻訳と投票を引き継ぐ", async () => {
		const user = await createUser();
		const page = await createPage({ userId: user.id, slug: "markdown-page" });
		vi.mocked(getCurrentUserFromHeaders).mockResolvedValue(toSessionUser(user));
		const form = new FormData();
		form.set("pageSlug", page.slug);
		form.set("title", "文書の見出し");
		form.set("userLocale", "ja");
		form.set("contentFormat", "markdown");
		const body =
			"残す段落\n\n~~取り消し~~\n\n- [x] 完了\n\n| 名前 | 値 |\n| --- | --- |\n| 本文 | 内容 |";
		form.set("pageContent", body);
		expect((await editPageContent({ data: form })).success).toBe(true);
		const segment = await db
			.selectFrom("segments")
			.selectAll()
			.where("contentId", "=", page.id)
			.where("text", "=", "残す段落")
			.executeTakeFirstOrThrow();
		const translation = await db
			.insertInto("segmentTranslations")
			.values({
				segmentId: segment.id,
				userId: user.id,
				locale: "en",
				text: "Preserved paragraph",
				point: 1,
			})
			.returningAll()
			.executeTakeFirstOrThrow();
		await db
			.insertInto("translationVotes")
			.values({
				translationId: translation.id,
				userId: user.id,
				isUpvote: true,
			})
			.execute();
		form.set("pageContent", `追加した段落\n\n${body}`);
		expect((await editPageContent({ data: form })).success).toBe(true);
		const stored = await db
			.selectFrom("pages")
			.select("mdastJson")
			.where("id", "=", page.id)
			.executeTakeFirstOrThrow();
		expect(stored.mdastJson).toMatchObject({
			children: [
				{ type: "paragraph" },
				{ type: "paragraph" },
				{ type: "paragraph", children: [{ type: "delete" }] },
				{ type: "list", children: [{ checked: true }] },
				{ type: "table" },
			],
		});
		expect(
			await db
				.selectFrom("segments")
				.select(["id", "number"])
				.where("contentId", "=", page.id)
				.where("text", "=", "残す段落")
				.executeTakeFirstOrThrow(),
		).toEqual({ id: segment.id, number: 2 });
		expect(
			await db
				.selectFrom("segmentTranslations")
				.select("text")
				.where("id", "=", translation.id)
				.executeTakeFirstOrThrow(),
		).toEqual({ text: "Preserved paragraph" });
		expect(
			await db
				.selectFrom("translationVotes")
				.select("isUpvote")
				.where("translationId", "=", translation.id)
				.executeTakeFirstOrThrow(),
		).toEqual({ isUpvote: true });
	});
});
