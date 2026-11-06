import { beforeEach, expect, it, vi } from "vitest";
import { getCurrentUserFromHeaders } from "@/app/_service/current-user";
import { enqueueTranslationJob } from "@/app/[locale]/_infrastructure/qstash/enqueue-translation-job.server";
import { db } from "@/db";
import { toSessionUser } from "@/tests/auth-helpers";
import { resetDatabase } from "@/tests/db-helpers";
import { createPage, createPageComment, createUser } from "@/tests/factories";
import { setupDbPerFile } from "@/tests/test-db-manager";
import { commentAction } from "./action";

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
	vi.mocked(enqueueTranslationJob).mockReset().mockResolvedValue([]);
});

it("21件目の新規コメントを投稿すると表示先の2ページ目を返す", async () => {
	const user = await createUser();
	const page = await createPage({ userId: user.id, slug: "new-comment-page" });
	for (let index = 0; index < 20; index++)
		await createPageComment({ userId: user.id, pageId: page.id });
	vi.mocked(getCurrentUserFromHeaders).mockResolvedValue(toSessionUser(user));
	expect(
		await commentAction({
			data: {
				pageId: page.id,
				userLocale: "ja",
				content: "<p>新しいコメント</p>",
			},
		}),
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
		await commentAction({
			data: {
				pageId: page.id,
				userLocale: "ja",
				parentId: root.id,
				content: "<p>返信コメント</p>",
			},
		}),
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
		await commentAction({
			data: {
				pageId: page.id,
				userLocale: "ja",
				content: "<p>20件目のコメント</p>",
			},
		}),
	).toMatchObject({ success: true, data: { commentPage: 1 } });
});
