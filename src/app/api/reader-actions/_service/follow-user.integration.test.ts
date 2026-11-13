import { beforeEach, expect, it, vi } from "vitest";
import { getCurrentUserFromHeaders } from "@/app/_service/current-user";
import { notifyPagePublication } from "@/app/_service/notify-page-publication";
import { db } from "@/db";
import { runTransaction } from "@/db/transaction";
import { toSessionUser } from "@/tests/auth-helpers";
import { resetDatabase } from "@/tests/db-helpers";
import { createPage, createUser } from "@/tests/factories";
import { setupDbPerFile } from "@/tests/test-db-manager";
import { followAction } from "./follow-user";

vi.mock("@/app/_service/current-user", () => ({
	getCurrentUserFromHeaders: vi.fn(),
}));
await setupDbPerFile(import.meta.url);
beforeEach(async () => {
	await resetDatabase();
	vi.clearAllMocks();
});

it("新着通知の登録を再送しても重複せず、解除後の新着は届かず再登録できる", async () => {
	const author = await createUser();
	const subscriber = await createUser();
	vi.mocked(getCurrentUserFromHeaders).mockResolvedValue(
		toSessionUser(subscriber),
	);
	const input = { targetUserId: author.id, locale: "ja" };
	await followAction({ ...input, action: "follow" }, new Headers());
	await expect(
		followAction({ ...input, action: "follow" }, new Headers()),
	).resolves.toMatchObject({ success: true, data: { isFollowing: true } });
	expect(await db.selectFrom("follows").selectAll().execute()).toHaveLength(1);
	expect(
		await db
			.selectFrom("notifications")
			.where("type", "=", "FOLLOW")
			.selectAll()
			.execute(),
	).toHaveLength(1);
	await followAction({ ...input, action: "unFollow" }, new Headers());
	await followAction({ ...input, action: "unFollow" }, new Headers());
	const stopped = await createPage({
		userId: author.id,
		slug: "after-unsubscribe",
	});
	await runTransaction((tx) => notifyPagePublication(tx, stopped.id));
	expect(
		await db
			.selectFrom("notifications")
			.where("userId", "=", subscriber.id)
			.selectAll()
			.execute(),
	).toEqual([]);
	await followAction({ ...input, action: "follow" }, new Headers());
	const resumed = await createPage({
		userId: author.id,
		slug: "after-resubscribe",
	});
	await runTransaction((tx) => notifyPagePublication(tx, resumed.id));
	expect(
		await db
			.selectFrom("notifications")
			.where("userId", "=", subscriber.id)
			.select(["type", "pageId"])
			.execute(),
	).toEqual([{ type: "PAGE_PUBLISHED", pageId: resumed.id }]);
});
