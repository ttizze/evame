import { describe, expect, test, vi } from "vitest";
import type { SqlExecutor, TursoDatabase } from "../db/turso-types";
import { NotFoundError } from "../domain/errors";
import {
	incrementPageView,
	readPageInteractionState,
	togglePageLike,
} from "./page-interactions";

function createDatabase({ published = true } = {}) {
	let liked = false;
	let likeCount = 0;
	let viewCount = 0;
	const run = vi.fn(async (sql: string) => {
		if (sql.startsWith("INSERT INTO like_pages")) {
			liked = true;
			likeCount += 1;
		}
		if (sql.startsWith("DELETE FROM like_pages")) {
			liked = false;
			likeCount -= 1;
		}
		if (sql.startsWith("INSERT INTO page_views")) viewCount += 1;
		return { changes: 1, lastInsertRowid: undefined };
	});
	const get = vi.fn(async <T>(sql: string): Promise<T | undefined> => {
		if (sql.includes("FROM scriptures")) {
			return (published ? { id: 1 } : undefined) as T | undefined;
		}
		if (sql.includes("COUNT(*) AS count FROM like_pages")) {
			return { count: likeCount } as T;
		}
		if (sql.includes("FROM page_views")) return { count: viewCount } as T;
		if (sql.includes("FROM like_pages WHERE page_id")) {
			return (liked ? { id: 1, liked: 1 } : undefined) as T | undefined;
		}
		return undefined;
	});
	const all = vi.fn(async <T>(): Promise<T[]> => []);
	const executor: SqlExecutor = {
		get: get as unknown as SqlExecutor["get"],
		all: all as unknown as SqlExecutor["all"],
		run,
	};
	const db: TursoDatabase = {
		...executor,
		async transaction<T>(callback: (transaction: SqlExecutor) => Promise<T>) {
			return callback(executor);
		},
		async close() {},
	};
	return { db, run };
}

describe("scriptureの閲覧数といいね", () => {
	test("公開ページの状態を読み、いいねの追加と取消を原子的に反映する", async () => {
		const { db, run } = createDatabase();

		expect(
			await readPageInteractionState(db, {
				pageId: 1,
				viewerUserId: "user-1",
			}),
		).toEqual({ liked: false, likeCount: 0, viewCount: 0 });

		expect(await togglePageLike(db, { pageId: 1, userId: "user-1" })).toEqual({
			liked: true,
			likeCount: 1,
		});
		expect(await togglePageLike(db, { pageId: 1, userId: "user-1" })).toEqual({
			liked: false,
			likeCount: 0,
		});
		expect(run.mock.calls.map(([sql]) => sql)).toEqual([
			"INSERT INTO like_pages (page_id, user_id) VALUES (?, ?)",
			"DELETE FROM like_pages WHERE id = ?",
		]);
	});

	test("公開ページの閲覧数を増やして新しい値を返す", async () => {
		const { db } = createDatabase();
		expect(await incrementPageView(db, 1)).toBe(1);
		expect(await incrementPageView(db, 1)).toBe(2);
	});

	test("非公開ページの状態変更を拒否する", async () => {
		const { db } = createDatabase({ published: false });
		await expect(
			readPageInteractionState(db, { pageId: 1 }),
		).rejects.toBeInstanceOf(NotFoundError);
		await expect(
			togglePageLike(db, { pageId: 1, userId: "user-1" }),
		).rejects.toBeInstanceOf(NotFoundError);
		await expect(incrementPageView(db, 1)).rejects.toBeInstanceOf(
			NotFoundError,
		);
	});
});
