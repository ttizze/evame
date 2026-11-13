import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createClient } from "@libsql/client";
import { expect, it } from "vitest";

it("新着通知への移行で既存通知・外部キー・索引を維持し、公開済み記事を新着にしない", async () => {
	const client = createClient({ url: "file::memory:" });
	try {
		for (const migration of [
			"0000_turso_initial",
			"0001_reader_publication",
			"0002_reader_cache_dependencies",
			"0003_page-comments",
		]) {
			const source = await readFile(
				resolve("src/drizzle", `${migration}.sql`),
				"utf8",
			);
			await client.batch(
				source
					.split("--> statement-breakpoint")
					.filter((statement) => statement.trim()),
				"write",
			);
		}
		await client.batch(
			[
				"INSERT INTO users (id, handle, email) VALUES ('author', 'author', 'author@example.test'), ('reader', 'reader', 'reader@example.test')",
				"INSERT INTO contents (id, kind) VALUES (1, 'PAGE'), (2, 'PAGE'), (3, 'PAGE')",
				"INSERT INTO pages (id, slug, user_id, status, mdast_json, published_at) VALUES (1, 'public', 'author', 'PUBLIC', '{}', NULL), (2, 'draft', 'author', 'DRAFT', '{}', NULL), (3, 'unpublished', 'author', 'DRAFT', '{}', 1000)",
				"INSERT INTO notifications (id, user_id, actor_id, type, read, created_at, page_id) VALUES (7, 'reader', 'author', 'PAGE_LIKE', 1, 1234, 1)",
				"INSERT INTO notifications (id, user_id, actor_id, type) VALUES (20, 'reader', 'author', 'FOLLOW')",
				"DELETE FROM notifications WHERE id = 20",
			],
			"write",
		);
		const previous = await client.execute("SELECT * FROM notifications");
		const source = await readFile(
			resolve("src/drizzle/0004_page-publication-notifications.sql"),
			"utf8",
		);
		await client.batch(
			source
				.split("--> statement-breakpoint")
				.filter((statement) => statement.trim()),
			"write",
		);
		expect((await client.execute("SELECT * FROM notifications")).rows).toEqual(
			previous.rows,
		);
		expect(
			(
				await client.execute(
					"SELECT publication_notified FROM pages ORDER BY id",
				)
			).rows.map((row) => row.publication_notified),
		).toEqual([1, 0, 1]);
		expect((await client.execute("PRAGMA foreign_key_check")).rows).toEqual([]);
		expect(
			(await client.execute("PRAGMA foreign_key_list(notifications)")).rows,
		).toHaveLength(5);
		expect(
			(await client.execute("PRAGMA index_list(notifications)")).rows
				.map((row) => row.name)
				.sort(),
		).toEqual(["notifications_actor_id_idx", "notifications_user_id_idx"]);
		await client.execute(
			"INSERT INTO notifications (user_id, actor_id, type, page_id) VALUES ('reader', 'author', 'PAGE_PUBLISHED', 1)",
		);
		expect(
			(
				await client.execute("SELECT id FROM notifications ORDER BY id")
			).rows.map((row) => row.id),
		).toEqual([7, 21]);
	} finally {
		client.close();
	}
});
