import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db";
import { runTransaction } from "@/db/transaction";
import { resetDatabase } from "@/tests/db-helpers";
import { createPage, createUser } from "@/tests/factories";
import { setupDbPerFile } from "@/tests/test-db-manager";
import { notifyPagePublication } from "./notify-page-publication";

await setupDbPerFile(import.meta.url);

describe("新着記事のサイト内通知", () => {
	beforeEach(async () => await resetDatabase());

	it("初回公開時の購読者だけに記事への通知を一度送る", async () => {
		const author = await createUser();
		const subscriber = await createUser();
		const unsubscribed = await createUser();
		await db
			.insertInto("follows")
			.values([
				{ followerId: subscriber.id, followingId: author.id },
				{ followerId: unsubscribed.id, followingId: author.id },
			])
			.execute();
		await db
			.deleteFrom("follows")
			.where("followerId", "=", unsubscribed.id)
			.execute();
		const page = await createPage({
			userId: author.id,
			slug: "first-publication",
			status: "DRAFT",
		});
		await runTransaction(async (tx) => {
			await notifyPagePublication(tx, page.id);
		});
		expect(await db.selectFrom("notifications").selectAll().execute()).toEqual(
			[],
		);
		await runTransaction(async (tx) => {
			await tx
				.updateTable("pages")
				.set({ status: "PUBLIC" })
				.where("id", "=", page.id)
				.execute();
			await notifyPagePublication(tx, page.id);
			await notifyPagePublication(tx, page.id);
		});
		await db
			.updateTable("pages")
			.set({ status: "DRAFT" })
			.where("id", "=", page.id)
			.execute();
		await runTransaction(async (tx) => {
			await tx
				.updateTable("pages")
				.set({ status: "PUBLIC" })
				.where("id", "=", page.id)
				.execute();
			await notifyPagePublication(tx, page.id);
		});
		expect(await db.selectFrom("notifications").selectAll().execute()).toEqual([
			expect.objectContaining({
				userId: subscriber.id,
				actorId: author.id,
				type: "PAGE_PUBLISHED",
				pageId: page.id,
				read: false,
			}),
		]);
	});

	it("購読者がいない初回公開や子記事を後から新着として送らない", async () => {
		const author = await createUser();
		const subscriber = await createUser();
		const page = await createPage({
			userId: author.id,
			slug: "no-subscribers",
		});
		await runTransaction(
			async (tx) => await notifyPagePublication(tx, page.id),
		);
		await db
			.insertInto("follows")
			.values({ followerId: subscriber.id, followingId: author.id })
			.execute();
		const child = await createPage({
			userId: author.id,
			slug: "child",
			parentId: page.id,
		});
		await runTransaction(async (tx) => {
			await notifyPagePublication(tx, page.id);
			await notifyPagePublication(tx, child.id);
		});
		expect(await db.selectFrom("notifications").selectAll().execute()).toEqual(
			[],
		);
	});

	it("公開のトランザクションが失敗したら通知と初回記録も戻し、再試行で送る", async () => {
		const author = await createUser();
		const subscriber = await createUser();
		await db
			.insertInto("follows")
			.values({ followerId: subscriber.id, followingId: author.id })
			.execute();
		const page = await createPage({ userId: author.id, slug: "rollback" });
		await expect(
			runTransaction(async (tx) => {
				await notifyPagePublication(tx, page.id);
				throw new Error("公開失敗");
			}),
		).rejects.toThrow("公開失敗");
		expect(await db.selectFrom("notifications").selectAll().execute()).toEqual(
			[],
		);
		await runTransaction(
			async (tx) => await notifyPagePublication(tx, page.id),
		);
		expect(
			await db.selectFrom("notifications").selectAll().execute(),
		).toHaveLength(1);
	});
});
