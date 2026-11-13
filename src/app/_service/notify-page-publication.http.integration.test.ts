// @vitest-environment node
import { afterAll, expect, it } from "vitest";
import { db, disposeDb } from "@/db";
import { runTransaction } from "@/db/transaction";
import { createPage, createUser } from "@/tests/factories";
import { setupDbPerFile } from "@/tests/test-db-manager";
import { startTursoServer } from "../../../scripts/turso-dev-server.mjs";
import { notifyPagePublication } from "./notify-page-publication";

await setupDbPerFile(import.meta.url);
const server = await startTursoServer(
	process.env.TURSO_DATABASE_URL!.replace(/^file:/, ""),
	null,
);
process.env.TURSO_DATABASE_URL = server.url;
afterAll(async () => {
	await disposeDb();
	await server.stop();
});

it("同じ記事のHTTP公開が同時に処理されても通知を一件だけ送る", async () => {
	const author = await createUser();
	const subscriber = await createUser();
	await db
		.insertInto("follows")
		.values({ followerId: subscriber.id, followingId: author.id })
		.execute();
	const page = await createPage({ userId: author.id, slug: "concurrent" });
	await Promise.all(
		Array.from({ length: 4 }, () =>
			runTransaction((tx) => notifyPagePublication(tx, page.id)),
		),
	);
	expect(
		await db.selectFrom("notifications").selectAll().execute(),
	).toHaveLength(1);
});
