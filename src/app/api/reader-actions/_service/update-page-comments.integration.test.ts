import { beforeEach, expect, it, vi } from "vitest";
import { getCurrentUserFromHeaders } from "@/app/_service/current-user";
import { db } from "@/db";
import { toSessionUser } from "@/tests/auth-helpers";
import { resetDatabase } from "@/tests/db-helpers";
import { createPage, createUser } from "@/tests/factories";
import { setupDbPerFile } from "@/tests/test-db-manager";
import { updatePageComments } from "./update-page-comments";

vi.mock("@/app/_service/current-user", () => ({
	getCurrentUserFromHeaders: vi.fn(),
}));
await setupDbPerFile(import.meta.url);
beforeEach(async () => {
	await resetDatabase();
	vi.clearAllMocks();
});

it("既存の記事はコメント受付がONで、所有者がOFF・ONを保存しても本文と公開状態は変わらない", async () => {
	const owner = await createUser();
	const page = await createPage({ userId: owner.id, slug: "comment-settings" });
	expect(page.commentsEnabled).toBe(true);
	vi.mocked(getCurrentUserFromHeaders).mockResolvedValue(toSessionUser(owner));
	for (const enabled of [false, true]) {
		expect(
			await updatePageComments(
				{ pageId: page.id, enabled, locale: "ja" },
				new Headers(),
			),
		).toEqual({ success: true, data: { commentsEnabled: enabled } });
		expect(
			await db
				.selectFrom("pages")
				.selectAll()
				.where("id", "=", page.id)
				.executeTakeFirstOrThrow(),
		).toEqual({ ...page, commentsEnabled: enabled });
	}
});

it("他人の記事とアーカイブ済み記事はコメント設定を変更できない", async () => {
	const owner = await createUser();
	const other = await createUser();
	const page = await createPage({ userId: owner.id, slug: "other-comments" });
	const archive = await createPage({
		userId: other.id,
		slug: "archived-comments",
		status: "ARCHIVE",
	});
	vi.mocked(getCurrentUserFromHeaders).mockResolvedValue(toSessionUser(other));
	for (const pageId of [page.id, archive.id, 999999])
		expect(
			await updatePageComments(
				{ pageId, enabled: false, locale: "ja" },
				new Headers(),
			),
		).toMatchObject({ success: false });
	expect(
		(
			await db
				.selectFrom("pages")
				.select("commentsEnabled")
				.where("id", "=", page.id)
				.executeTakeFirstOrThrow()
		).commentsEnabled,
	).toBe(true);
});

it("未ログインでは現在の言語のログイン画面へ遷移する", async () => {
	vi.mocked(getCurrentUserFromHeaders).mockResolvedValue(null);
	await expect(
		updatePageComments(
			{ pageId: 1, enabled: false, locale: "ja" },
			new Headers(),
		),
	).rejects.toMatchObject({ options: { href: "/ja/auth/login" } });
});

it("文字列のfalseをONとして扱わず、不正な入力を拒否する", async () => {
	await expect(
		updatePageComments(
			{ pageId: 1, enabled: "false" as unknown as boolean, locale: "ja" },
			new Headers(),
		),
	).rejects.toThrow();
});

it("コメント受付を変更すると記事の配信版を進め、一覧全体は更新対象にしない", async () => {
	const owner = await createUser();
	const page = await createPage({ userId: owner.id, slug: "comment-cache" });
	vi.mocked(getCurrentUserFromHeaders).mockResolvedValue(toSessionUser(owner));
	const before = await db.selectFrom("readerRevisions").selectAll().execute();
	await updatePageComments(
		{ pageId: page.id, enabled: false, locale: "ja" },
		new Headers(),
	);
	const after = await db.selectFrom("readerRevisions").selectAll().execute();
	expect(
		after.find(({ key }) => key === `page:${page.id}`)?.revision,
	).toBeGreaterThan(
		before.find(({ key }) => key === `page:${page.id}`)?.revision ?? 0,
	);
	expect(
		after.filter(
			({ key }) =>
				key.startsWith("list:") ||
				key.startsWith("profile:") ||
				key.startsWith("tag:"),
		),
	).toEqual(
		before.filter(
			({ key }) =>
				key.startsWith("list:") ||
				key.startsWith("profile:") ||
				key.startsWith("tag:"),
		),
	);
});
