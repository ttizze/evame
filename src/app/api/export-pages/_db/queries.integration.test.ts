import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db";
import { resetDatabase } from "@/tests/db-helpers";
import { createPage, createSegment, createUser } from "@/tests/factories";
import { setupDbPerFile } from "@/tests/test-db-manager";
import { fetchExportPage, fetchExportPageIds } from "./queries";

await setupDbPerFile(import.meta.url);
beforeEach(resetDatabase);

describe("自分の文書の一括書き出し", () => {
	it("公開・非公開・アーカイブを含む自分の全文書だけをID順に取得する", async () => {
		const owner = await createUser();
		const other = await createUser();
		const pages = [];
		for (const status of ["DRAFT", "PUBLIC", "ARCHIVE"] as const) {
			pages.push(await createPage({ userId: owner.id, slug: status, status }));
		}
		const otherPage = await createPage({
			userId: other.id,
			slug: "other-private",
			status: "DRAFT",
		});
		expect(await fetchExportPageIds(owner.id)).toEqual(
			pages.map(({ id }) => ({ id })),
		);
		expect(await fetchExportPage(owner.id, otherPage.id)).toBeUndefined();
	});
	it("表示言語の翻訳ではなく原文のタイトル・本文・タグを取得する", async () => {
		const owner = await createUser();
		const mdastJson = {
			type: "root",
			children: [
				{ type: "paragraph", children: [{ type: "text", value: "原文" }] },
			],
		};
		const page = await createPage({
			userId: owner.id,
			slug: "source",
			mdastJson,
			sourceLocale: "ja",
		});
		await createSegment({
			contentId: page.id,
			number: 0,
			text: "原文のタイトル",
			textAndOccurrenceHash: "source-title",
		});
		const tag = await db
			.insertInto("tags")
			.values({ name: "タグ" })
			.returningAll()
			.executeTakeFirstOrThrow();
		await db
			.insertInto("tagPages")
			.values({ pageId: page.id, tagId: tag.id })
			.execute();
		expect(await fetchExportPage(owner.id, page.id)).toMatchObject({
			id: page.id,
			title: "原文のタイトル",
			mdastJson,
			sourceLocale: "ja",
			tagsJson: '["タグ"]',
		});
	});
});
