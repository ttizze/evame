import { beforeEach, expect, it } from "vitest";
import { resetDatabase } from "@/tests/db-helpers";
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
