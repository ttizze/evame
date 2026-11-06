import { CompiledQuery } from "kysely";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { db } from "@/db";
import { resetDatabase } from "@/tests/db-helpers";
import {
	createPage,
	createPageWithSegments,
	createUser,
} from "@/tests/factories";
import { setupDbPerFile } from "@/tests/test-db-manager";
import { loadAboutPage } from "./load-about-page";

await setupDbPerFile(import.meta.url);
beforeEach(resetDatabase);
afterEach(() => vi.restoreAllMocks());

it.each([
	["ja", "evame", "en"],
	["en", "evame-ja", "ja"],
	["ko", "evame-ja", "ja"],
] as const)(
	"%sでは逆の原文と著者が賛成した翻訳を1クエリで取得する",
	async (locale, slug, sourceLocale) => {
		const owner = await createUser();
		const translator = await createUser();
		const page = await createPageWithSegments({
			userId: owner.id,
			slug,
			sourceLocale,
			segments: [
				{ number: 1, text: "本文", textAndOccurrenceHash: "body" },
				{ number: 0, text: "見出し", textAndOccurrenceHash: "title" },
			],
		});
		const segment = await db
			.selectFrom("segments")
			.selectAll()
			.where("contentId", "=", page.id)
			.where("number", "=", 1)
			.executeTakeFirstOrThrow();
		const translations = await db
			.insertInto("segmentTranslations")
			.values([
				{
					segmentId: segment.id,
					locale,
					text: "高得点",
					point: 100,
					userId: translator.id,
				},
				{
					segmentId: segment.id,
					locale,
					text: "著者の選択",
					point: 1,
					userId: owner.id,
				},
				{
					segmentId: segment.id,
					locale: "fr",
					text: "別の言語",
					point: 200,
					userId: translator.id,
				},
			])
			.returning("id")
			.execute();
		await db
			.insertInto("translationVotes")
			.values({
				translationId: translations[1].id,
				userId: owner.id,
				isUpvote: true,
			})
			.execute();
		const execute = vi.spyOn(db.getExecutor(), "executeQuery");
		const result = await loadAboutPage(locale);
		expect(execute).toHaveBeenCalledTimes(1);
		expect(result).toEqual({
			sourceLocale,
			segments: [
				expect.objectContaining({
					contentId: page.id,
					number: 0,
					text: "見出し",
					translationText: null,
				}),
				{
					id: segment.id,
					contentId: page.id,
					number: 1,
					text: "本文",
					translationText: "著者の選択",
				},
			],
		});
		const query = execute.mock.calls[0][0];
		const plan = await db.executeQuery<{ detail: string }>(
			CompiledQuery.raw(`EXPLAIN QUERY PLAN ${query.sql}`, [
				...query.parameters,
			]),
		);
		expect(
			plan.rows.filter(({ detail }) => /^SCAN segments\b/i.test(detail)),
		).toEqual([]);
	},
);

it("説明ページがなければnullを返す", async () => {
	expect(await loadAboutPage("ja")).toBeNull();
});

it("段落のない説明ページは空の段落一覧を返す", async () => {
	const owner = await createUser();
	await createPage({ userId: owner.id, slug: "evame", sourceLocale: "en" });
	expect(await loadAboutPage("ja")).toEqual({
		sourceLocale: "en",
		segments: [],
	});
});

it("アーカイブした説明ページを表示しない", async () => {
	const owner = await createUser();
	await createPage({ userId: owner.id, slug: "evame", status: "ARCHIVE" });
	expect(await loadAboutPage("ja")).toBeNull();
});
