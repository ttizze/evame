import { sql } from "kysely";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db";
import { resetDatabase } from "@/tests/db-helpers";
import { createPage, createSegment, createUser } from "@/tests/factories";
import { setupDbPerFile } from "@/tests/test-db-manager";
import { fetchReaderChanges, fetchReaderRevision } from "./queries";

await setupDbPerFile(import.meta.url);
beforeEach(resetDatabase);

async function changedSince(revision: number) {
	return (await fetchReaderChanges(revision)).map((row) => row.key);
}
describe("Readerの対象別キャッシュ無効化", () => {
	it("本文編集では対象記事だけを変更し新着一覧や無関係な記事を無効化しない", async () => {
		const user = await createUser();
		const page = await createPage({
			slug: crypto.randomUUID(),
			userId: user.id,
			status: "PUBLIC",
		});
		const other = await createPage({
			slug: crypto.randomUUID(),
			userId: user.id,
			status: "PUBLIC",
		});
		const { revision } = await fetchReaderRevision();
		await db
			.updateTable("pages")
			.set({ mdastJson: { type: "root", children: [] } })
			.where("id", "=", page.id)
			.execute();
		const keys = await changedSince(revision);
		expect(keys).toContain(`page:${page.id}`);
		expect(keys).not.toContain(`page:${other.id}`);
		expect(keys).not.toContain("list:new");
	});
	it("新規公開と非公開化は新着と著者と該当タグの一覧グループを記録する", async () => {
		const user = await createUser();
		const page = await createPage({
			slug: crypto.randomUUID(),
			userId: user.id,
			status: "DRAFT",
		});
		const tag = await db
			.insertInto("tags")
			.values({ name: "対象タグ" })
			.returningAll()
			.executeTakeFirstOrThrow();
		await db
			.insertInto("tagPages")
			.values({ pageId: page.id, tagId: tag.id })
			.execute();
		for (const status of ["PUBLIC", "DRAFT"] as const) {
			const { revision } = await fetchReaderRevision();
			await db
				.updateTable("pages")
				.set({ status })
				.where("id", "=", page.id)
				.execute();
			expect(await changedSince(revision)).toEqual(
				expect.arrayContaining([
					"list:new",
					"list:home",
					`profile:${user.id}`,
					"tag:対象タグ",
					`page:${page.id}`,
				]),
			);
		}
	});
	it("子記事の移動と削除は移動前後の階層だけを無効化する", async () => {
		const user = await createUser();
		const root = await createPage({
			slug: crypto.randomUUID(),
			userId: user.id,
			status: "PUBLIC",
		});
		const target = await createPage({
			slug: crypto.randomUUID(),
			userId: user.id,
			status: "PUBLIC",
		});
		const other = await createPage({
			slug: crypto.randomUUID(),
			userId: user.id,
			status: "PUBLIC",
		});
		const child = await createPage({
			slug: crypto.randomUUID(),
			userId: user.id,
			status: "PUBLIC",
			parentId: root.id,
		});
		const { revision } = await fetchReaderRevision();
		await db
			.updateTable("pages")
			.set({ parentId: target.id })
			.where("id", "=", child.id)
			.execute();
		const keys = await changedSince(revision);
		expect(keys).toEqual(
			expect.arrayContaining([`tree:${root.id}`, `tree:${target.id}`]),
		);
		expect(keys).not.toContain(`tree:${other.id}`);
		const beforeDelete = await fetchReaderRevision();
		await db.deleteFrom("pages").where("id", "=", child.id).execute();
		expect(await changedSince(beforeDelete.revision)).toContain(
			`tree:${target.id}`,
		);
	});
	it("タイトル翻訳は階層に反映し本文の段落編集では階層を無効化しない", async () => {
		const user = await createUser();
		const root = await createPage({
			slug: crypto.randomUUID(),
			userId: user.id,
			status: "PUBLIC",
		});
		const child = await createPage({
			slug: crypto.randomUUID(),
			userId: user.id,
			status: "PUBLIC",
			parentId: root.id,
		});
		const title = await createSegment({
			text: "段落",
			textAndOccurrenceHash: crypto.randomUUID(),
			contentId: child.id,
			number: 0,
		});
		const body = await createSegment({
			text: "段落",
			textAndOccurrenceHash: crypto.randomUUID(),
			contentId: child.id,
			number: 1,
		});
		const { revision } = await fetchReaderRevision();
		await db
			.insertInto("segmentTranslations")
			.values({
				segmentId: title.id,
				userId: user.id,
				locale: "en",
				text: "Title",
			})
			.execute();
		expect(await changedSince(revision)).toContain(`tree:${root.id}`);
		const beforeBody = await fetchReaderRevision();
		await db
			.updateTable("segments")
			.set({ text: "本文編集" })
			.where("id", "=", body.id)
			.execute();
		expect(await changedSince(beforeBody.revision)).not.toContain(
			`tree:${root.id}`,
		);
	});
	it("タグの削除は削除前の名前の一覧と記事を無効化する", async () => {
		const user = await createUser();
		const page = await createPage({
			slug: crypto.randomUUID(),
			userId: user.id,
			status: "PUBLIC",
		});
		const tag = await db
			.insertInto("tags")
			.values({ name: "削除前のタグ" })
			.returningAll()
			.executeTakeFirstOrThrow();
		await db
			.insertInto("tagPages")
			.values({ pageId: page.id, tagId: tag.id })
			.execute();
		const { revision } = await fetchReaderRevision();
		await db.deleteFrom("tagPages").where("pageId", "=", page.id).execute();
		expect(await changedSince(revision)).toContain("tag:削除前のタグ");
	});
	it("表示名とハンドル変更は旧著者名と新著者名へ反映し所有記事数に比例させない", async () => {
		const user = await createUser();
		const { revision } = await fetchReaderRevision();
		await db
			.updateTable("users")
			.set({ name: "新しい名前", handle: "new-handle" })
			.where("id", "=", user.id)
			.execute();
		expect(await changedSince(revision)).toEqual(
			expect.arrayContaining([
				`user:${user.id}`,
				`author:${user.handle}`,
				"author:new-handle",
			]),
		);
	});
	it("フォローの追加と解除は当事者のプロフィール一覧だけを更新する", async () => {
		const follower = await createUser();
		const following = await createUser();
		let { revision } = await fetchReaderRevision();
		await db
			.insertInto("follows")
			.values({ followerId: follower.id, followingId: following.id })
			.execute();
		expect(await changedSince(revision)).toEqual(
			expect.arrayContaining([
				`profile:${follower.id}`,
				`profile:${following.id}`,
			]),
		);
		({ revision } = await fetchReaderRevision());
		await db
			.deleteFrom("follows")
			.where("followerId", "=", follower.id)
			.execute();
		expect(await changedSince(revision)).toEqual(
			expect.arrayContaining([
				`profile:${follower.id}`,
				`profile:${following.id}`,
			]),
		);
	});
});

it("変更キーは全記事走査ではなく更新版のインデックスで取得する", async () => {
	const plan = await sql<{
		detail: string;
	}>`EXPLAIN QUERY PLAN SELECT key FROM reader_revisions WHERE revision > 10 AND key != '*'`.execute(
		db,
	);
	expect(plan.rows.map((row) => row.detail).join("\n")).toContain(
		"reader_revisions_revision_idx",
	);
});
