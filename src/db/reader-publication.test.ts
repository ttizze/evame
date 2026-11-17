import { beforeEach, expect, it } from "vitest";
import { resetDatabase } from "@/tests/db-helpers";
import { createPage, createUser } from "@/tests/factories";
import { setupDbPerFile } from "@/tests/test-db-manager";
import { db } from ".";
import { deleteReaderPublicationChanges } from "./mutations";
import { fetchReaderPublicationChanges } from "./queries";

await setupDbPerFile(import.meta.url);
beforeEach(async () => {
	await resetDatabase();
});

it("本文の変更と同じトランザクションで公開HTMLの更新を記録しロールバックも揃える", async () => {
	await expect(
		db.transaction().execute(async (tx) => {
			await tx
				.insertInto("readerRevisions")
				.values({ key: "page:rollback", revision: 100 })
				.execute();
			expect(
				await tx
					.selectFrom("readerPublicationChanges")
					.selectAll()
					.where("key", "=", "page:rollback")
					.executeTakeFirst(),
			).toEqual({ key: "page:rollback", revision: 100 });
			throw new Error("rollback");
		}),
	).rejects.toThrow(/^rollback$/);
	expect(
		await db
			.selectFrom("readerPublicationChanges")
			.selectAll()
			.where("key", "=", "page:rollback")
			.execute(),
	).toEqual([]);
});
it("同じ記事の変更を最新版へまとめAboutにも反映する", async () => {
	const key = `page:${crypto.randomUUID()}`;
	await db
		.insertInto("readerRevisions")
		.values({ key, revision: 100 })
		.execute();
	await db
		.updateTable("readerRevisions")
		.set({ revision: 101 })
		.where("key", "=", key)
		.execute();
	expect(await fetchReaderPublicationChanges()).toEqual(
		expect.arrayContaining([
			{ key, revision: 101 },
			{ key: "about", revision: 101 },
		]),
	);
});
it("R2への反映中に届いた後続の変更を完了処理で消さない", async () => {
	const key = `page:${crypto.randomUUID()}`;
	await db
		.insertInto("readerRevisions")
		.values({ key, revision: 100 })
		.execute();
	const pending = await fetchReaderPublicationChanges();
	await db
		.updateTable("readerRevisions")
		.set({ revision: 101 })
		.where("key", "=", key)
		.execute();
	await deleteReaderPublicationChanges(pending);
	expect(await fetchReaderPublicationChanges()).toEqual(
		expect.arrayContaining([{ key, revision: 101 }]),
	);
});

it("公開記事へのいいねと解除で人気順のトップと著者一覧を更新する", async () => {
	const author = await createUser();
	const reader = await createUser();
	const page = await createPage({ userId: author.id, slug: "popular" });
	await db.deleteFrom("readerPublicationChanges").execute();
	await db
		.insertInto("likePages")
		.values({ pageId: page.id, userId: reader.id })
		.execute();
	const liked = await fetchReaderPublicationChanges();
	expect(liked.map((row) => row.key).sort()).toEqual(
		["about", "list:home", "profile:" + author.id].sort(),
	);
	await deleteReaderPublicationChanges(liked);
	await db.deleteFrom("likePages").where("pageId", "=", page.id).execute();
	const unliked = await fetchReaderPublicationChanges();
	expect(unliked.map((row) => row.key).sort()).toEqual(
		liked.map((row) => row.key).sort(),
	);
	expect(
		unliked.find((row) => row.key === "list:home")?.revision,
	).toBeGreaterThan(
		liked.find((row) => row.key === "list:home")?.revision ?? 0,
	);
});
it("非公開記事や子記事へのいいねでは公開一覧を更新しない", async () => {
	const author = await createUser();
	const reader = await createUser();
	const parent = await createPage({ userId: author.id, slug: "parent" });
	const child = await createPage({
		userId: author.id,
		slug: "child",
		parentId: parent.id,
	});
	const draft = await createPage({
		userId: author.id,
		slug: "draft",
		status: "DRAFT",
	});
	await db.deleteFrom("readerPublicationChanges").execute();
	for (const page of [child, draft])
		await db
			.insertInto("likePages")
			.values({ pageId: page.id, userId: reader.id })
			.execute();
	expect(await fetchReaderPublicationChanges()).toEqual([]);
});
it("いいねが別の記事へ移動した場合は変更前後の著者一覧を更新する", async () => {
	const author = await createUser();
	const other = await createUser();
	const reader = await createUser();
	const page = await createPage({ userId: author.id, slug: "before" });
	const moved = await createPage({ userId: other.id, slug: "after" });
	await db
		.insertInto("likePages")
		.values({ pageId: page.id, userId: reader.id })
		.execute();
	await db.deleteFrom("readerPublicationChanges").execute();
	await db
		.updateTable("likePages")
		.set({ pageId: moved.id })
		.where("pageId", "=", page.id)
		.execute();
	expect(
		(await fetchReaderPublicationChanges()).map((row) => row.key).sort(),
	).toEqual(
		[
			"about",
			"list:home",
			"profile:" + author.id,
			"profile:" + other.id,
		].sort(),
	);
});
it("いいねのロールバック時は一覧の更新記録も残さない", async () => {
	const author = await createUser();
	const reader = await createUser();
	const page = await createPage({ userId: author.id, slug: "rollback-like" });
	await db.deleteFrom("readerPublicationChanges").execute();
	await expect(
		db.transaction().execute(async (tx) => {
			await tx
				.insertInto("likePages")
				.values({ pageId: page.id, userId: reader.id })
				.execute();
			expect(
				await tx
					.selectFrom("readerPublicationChanges")
					.select("key")
					.where("key", "=", "list:home")
					.executeTakeFirst(),
			).toBeDefined();
			throw new Error("rollback");
		}),
	).rejects.toThrow("rollback");
	expect(await fetchReaderPublicationChanges()).toEqual([]);
});
