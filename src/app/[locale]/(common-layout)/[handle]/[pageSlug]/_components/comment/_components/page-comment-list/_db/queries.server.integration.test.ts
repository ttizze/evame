import { CompiledQuery } from "kysely";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { db } from "@/db";
import { resetDatabase } from "@/tests/db-helpers";
import {
	createPage,
	createPageComment,
	createSegment,
	createUser,
} from "@/tests/factories";
import { setupDbPerFile } from "@/tests/test-db-manager";
import { fetchPageCommentsWithSegments } from "./queries.server";

await setupDbPerFile(import.meta.url);
beforeEach(resetDatabase);
afterEach(() => vi.restoreAllMocks());

it("コメントを20スレッドずつ取得し、続きの返信・削除表示・翻訳・全体件数を保つ", async () => {
	const user = await createUser();
	const page = await createPage({ userId: user.id, slug: "comments" });
	const roots = [];
	for (let i = 0; i < 21; i++) {
		const comment = await createPageComment({
			userId: user.id,
			pageId: page.id,
			isDeleted: i === 0,
		});
		await db
			.updateTable("pageComments")
			.set({ createdAt: new Date(Date.UTC(2026, 0, 1, 0, 0, i)) })
			.where("id", "=", comment.id)
			.execute();
		const segment = await createSegment({
			contentId: comment.id,
			number: 0,
			text: `原文${i}`,
			textAndOccurrenceHash: `comment-${i}`,
		});
		await db
			.insertInto("segmentTranslations")
			.values({
				segmentId: segment.id,
				userId: user.id,
				locale: "ja",
				text: `翻訳${i}`,
			})
			.execute();
		roots.push(comment.id);
	}
	const reply = await createPageComment({
		userId: user.id,
		pageId: page.id,
		parentId: roots[20],
	});
	const grandchild = await createPageComment({
		userId: user.id,
		pageId: page.id,
		parentId: reply.id,
	});
	const other = await createPage({
		userId: user.id,
		slug: "other-page",
		status: "DRAFT",
	});
	await createPageComment({
		userId: user.id,
		pageId: other.id,
		parentId: roots[20],
	});
	const execute = vi.spyOn(db.getExecutor(), "executeQuery");
	const first = await fetchPageCommentsWithSegments(page.id, "ja", 1);
	expect(first.comments.map((row) => row.id)).toEqual(roots.slice(0, 20));
	expect(first.comments[0].isDeleted).toBe(true);
	expect(first.comments[0].content.segments[0].translationText).toBe("翻訳0");
	expect(first.count).toBe(22);
	expect(first.totalPages).toBe(2);
	expect(
		execute.mock.calls.some(([query]) =>
			query.sql.includes("limit ? offset ?"),
		),
	).toBe(true);
	const query = execute.mock.calls.find(([query]) =>
		query.sql.includes("with recursive"),
	)?.[0];
	if (!query) throw new Error("コメントスレッドのクエリが実行されていません");
	const plan = await db.executeQuery<{ detail: string }>(
		CompiledQuery.raw(`EXPLAIN QUERY PLAN ${query.sql}`, [...query.parameters]),
	);
	expect(
		plan.rows.filter(({ detail }) =>
			detail.includes("(page_id=? AND parent_id=?)"),
		).length,
	).toBeGreaterThanOrEqual(2);
	const second = await fetchPageCommentsWithSegments(page.id, "ja", 2);
	expect(second.comments.map((row) => row.id)).toEqual([
		roots[20],
		reply.id,
		grandchild.id,
	]);
	expect(second.comments[0].content.segments[0].translationText).toBe("翻訳20");
	expect(second.count).toBe(22);
	expect(second.totalPages).toBe(2);
});

it("コメントのない記事では件数もページ数もゼロを返す", async () => {
	const user = await createUser();
	const page = await createPage({ userId: user.id, slug: "empty-comments" });
	expect(await fetchPageCommentsWithSegments(page.id, "ja", 1)).toEqual({
		comments: [],
		count: 0,
		totalPages: 0,
	});
});

it("同時刻のコメントもID順でページ分けして重複や欠落を防ぐ", async () => {
	const user = await createUser();
	const page = await createPage({
		userId: user.id,
		slug: "same-time-comments",
	});
	const ids = [];
	for (let index = 0; index < 21; index++)
		ids.push(
			(await createPageComment({ userId: user.id, pageId: page.id })).id,
		);
	await db
		.updateTable("pageComments")
		.set({ createdAt: new Date("2026-01-01T00:00:00Z") })
		.where("pageId", "=", page.id)
		.execute();
	const first = await fetchPageCommentsWithSegments(page.id, "ja", 1);
	const second = await fetchPageCommentsWithSegments(page.id, "ja", 2);
	expect([...first.comments, ...second.comments].map((row) => row.id)).toEqual(
		ids,
	);
	expect(first.comments).toHaveLength(20);
	expect(second.comments).toHaveLength(1);
});
