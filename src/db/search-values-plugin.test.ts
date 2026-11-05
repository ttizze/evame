import { expect, it } from "vitest";
import { fetchSearchResults } from "@/app/[locale]/(common-layout)/search/_db/queries";
import { db } from "@/db";
import { createPageWithSegments, createUser } from "@/tests/factories";
import { setupDbPerFile } from "@/tests/test-db-manager";

await setupDbPerFile(import.meta.url);

it("記事・タグ・ユーザーを英字以外でも大文字小文字を区別せず検索する", async () => {
	const user = await createUser({ name: "ÉCOLE Автор" });
	const article = await createPageWithSegments({
		userId: user.id,
		slug: "unicode-search",
		segments: [
			{
				number: 0,
				text: "ÉCOLE Автор",
				textAndOccurrenceHash: "unicode-title",
			},
		],
	});
	await db.insertInto("tags").values({ name: "ÉCOLE Автор" }).execute();
	for (const query of ["école", "автор"]) {
		const input = { query, page: 1, locale: "ja", tagPage: "false" as const };
		expect(
			(
				await fetchSearchResults({ ...input, category: "title" })
			).pageSummaries?.map((page) => page.id),
		).toContain(article.id);
		expect(
			(await fetchSearchResults({ ...input, category: "tags" })).tags?.map(
				(tag) => tag.name,
			),
		).toContain("ÉCOLE Автор");
		expect(
			(await fetchSearchResults({ ...input, category: "user" })).users?.map(
				(result) => result.handle,
			),
		).toContain(user.handle);
	}
	await db
		.updateTable("users")
		.set({ name: "ÖSTERREICH" })
		.where("id", "=", user.id)
		.execute();
	expect(
		(
			await fetchSearchResults({
				query: "österreich",
				page: 1,
				locale: "ja",
				tagPage: "false",
				category: "user",
			})
		).users?.map((result) => result.handle),
	).toContain(user.handle);
});
