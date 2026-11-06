import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { db } from "@/db";
import { resetDatabase } from "@/tests/db-helpers";
import { createPageWithSegments, createUser } from "@/tests/factories";
import { setupDbPerFile } from "@/tests/test-db-manager";
import { loadReaderData } from "./load-reader-data";

await setupDbPerFile(import.meta.url);
beforeEach(resetDatabase);
afterEach(() => vi.unstubAllGlobals());

it("AboutのHTMLを事前生成するときに、以前の件数キャッシュを使わず公開状態を集計する", async () => {
	vi.stubGlobal("caches", {
		open: async () => ({
			match: async () =>
				Response.json({ articles: 999, translations: 999, languages: 18 }),
			put: vi.fn(),
		}),
	});
	const user = await createUser();
	await createPageWithSegments({
		userId: user.id,
		slug: "evame-ja",
		segments: [{ number: 0, text: "About", textAndOccurrenceHash: "about" }],
	});
	const article = await createPageWithSegments({
		userId: user.id,
		slug: "article",
		segments: [{ number: 0, text: "記事", textAndOccurrenceHash: "article" }],
	});
	const before = await loadReaderData("/en/about", "", new Headers());
	expect(before?.kind).toBe("about");
	if (before?.kind !== "about") throw new Error("Aboutのデータがない");
	expect(before.data.stats.articles).toBe(2);
	await db
		.updateTable("pages")
		.set({ status: "DRAFT" })
		.where("id", "=", article.id)
		.execute();
	const after = await loadReaderData("/en/about", "", new Headers());
	if (after?.kind !== "about") throw new Error("Aboutのデータがない");
	expect(after.data.stats.articles).toBe(1);
});
