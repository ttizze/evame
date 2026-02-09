import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db";
import { resetDatabase } from "@/tests/db-helpers";
import { createPage, createUser } from "@/tests/factories";
import { setupDbPerFile } from "@/tests/test-db-manager";
import { deletePage } from "./mutations.server";

await setupDbPerFile(import.meta.url);

describe("deletePage", () => {
	beforeEach(async () => {
		await resetDatabase();
	});

	it("自分のページを削除すると pages から消えて deleted_pages に退避される", async () => {
		const user = await createUser();
		const page = await createPage({
			userId: user.id,
			slug: "deleting-page",
		});

		await deletePage(page.id, user.id);

		const remainingPage = await db
			.selectFrom("pages")
			.select("id")
			.where("id", "=", page.id)
			.executeTakeFirst();
		expect(remainingPage).toBeUndefined();

		const movedPage = await db
			.selectFrom("deletedPages")
			.select(["pageId", "slug", "userId"])
			.where("pageId", "=", page.id)
			.execute();

		expect(movedPage).toHaveLength(1);
		expect(movedPage[0]).toStrictEqual({
			pageId: page.id,
			slug: page.slug,
			userId: user.id,
		});
	});

	it("他人のページは削除できず deleted_pages にも退避されない", async () => {
		const owner = await createUser({ handle: "owner" });
		const otherUser = await createUser({ handle: "other-user" });
		const page = await createPage({
			userId: owner.id,
			slug: "owner-page",
		});

		await expect(deletePage(page.id, otherUser.id)).rejects.toThrow(
			"Page not found or unauthorized",
		);

		const existingPage = await db
			.selectFrom("pages")
			.select("id")
			.where("id", "=", page.id)
			.executeTakeFirst();
		expect(existingPage).toStrictEqual({ id: page.id });

		const movedPages = await db
			.selectFrom("deletedPages")
			.select("pageId")
			.where("pageId", "=", page.id)
			.execute();

		expect(movedPages).toHaveLength(0);
	});
});
