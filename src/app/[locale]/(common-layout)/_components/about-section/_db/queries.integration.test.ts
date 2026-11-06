import { CompiledQuery } from "kysely";
import { beforeEach, expect, it, vi } from "vitest";
import { db } from "@/db";
import { resetDatabase } from "@/tests/db-helpers";
import { createPageWithSegments, createUser } from "@/tests/factories";
import { setupDbPerFile } from "@/tests/test-db-manager";
import { querySocialProofStats } from "./queries";

await setupDbPerFile(import.meta.url);
beforeEach(resetDatabase);

it("公開されたルート記事とその翻訳だけを1回のSQLで数える", async () => {
	const owner = await createUser();
	const root = await createPageWithSegments({
		userId: owner.id,
		slug: "root",
		segments: [{ number: 0, text: "Root", textAndOccurrenceHash: "root" }],
	});
	for (const [slug, status, parentId] of [
		["public", "PUBLIC", null],
		["child", "PUBLIC", root.id],
		["draft", "DRAFT", null],
		["archive", "ARCHIVE", null],
	] as const) {
		const page = await createPageWithSegments({
			userId: owner.id,
			slug,
			status,
			segments: [{ number: 0, text: slug, textAndOccurrenceHash: slug }],
		});
		await db
			.updateTable("pages")
			.set({ parentId })
			.where("id", "=", page.id)
			.execute();
		const segment = await db
			.selectFrom("segments")
			.select("id")
			.where("contentId", "=", page.id)
			.executeTakeFirstOrThrow();
		await db
			.insertInto("segmentTranslations")
			.values({
				segmentId: segment.id,
				locale: "ja",
				text: "翻訳",
				userId: owner.id,
			})
			.execute();
	}
	const execute = vi.spyOn(db.getExecutor(), "executeQuery");
	expect(await querySocialProofStats().executeTakeFirstOrThrow()).toEqual({
		articles: 2,
		translations: 1,
		languages: 18,
	});
	expect(execute).toHaveBeenCalledTimes(1);
	const query = execute.mock.calls[0][0];
	const plan = await db.executeQuery<{ detail: string }>(
		CompiledQuery.raw(`EXPLAIN QUERY PLAN ${query.sql}`, [...query.parameters]),
	);
	expect(
		plan.rows.filter(({ detail }) => /^SCAN segments\b/i.test(detail)),
	).toEqual([]);
});

it("記事も翻訳もない場合は件数をゼロで返す", async () => {
	expect(await querySocialProofStats().executeTakeFirstOrThrow()).toEqual({
		articles: 0,
		translations: 0,
		languages: 18,
	});
});
