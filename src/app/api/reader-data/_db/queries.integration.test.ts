import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db";
import { resetDatabase } from "@/tests/db-helpers";
import { createPage, createSegment, createUser } from "@/tests/factories";
import { setupDbPerFile } from "@/tests/test-db-manager";
import { fetchReaderCatalogSources } from "./queries";

await setupDbPerFile(import.meta.url);
beforeEach(resetDatabase);

describe("公開HTMLの更新検出", () => {
	it("公開記事の本文変更と非公開化を異なる版として検出する", async () => {
		const user = await createUser();
		const page = await createPage({
			userId: user.id,
			slug: "article",
			status: "PUBLIC",
		});
		await createSegment({
			contentId: page.id,
			number: 0,
			text: "見出し",
			textAndOccurrenceHash: "title",
		});
		const initial = await fetchReaderCatalogSources();
		expect(initial.pages.find((row) => row.id === page.id)).toMatchObject({
			hasTitle: 1,
			parentId: null,
			userId: user.id,
			createdAt: expect.any(Number),
			commentRoots: 0,
		});
		await db
			.updateTable("pages")
			.set({ mdastJson: { type: "root", children: [] } })
			.where("id", "=", page.id)
			.execute();
		const edited = await fetchReaderCatalogSources();
		expect(edited.revision).toBeGreaterThan(initial.revision);
		expect(edited.pages[0].navigationRevision).toBe(
			initial.pages[0].navigationRevision,
		);
		expect(
			edited.pages.find((row) => row.id === page.id)?.revision,
		).toBeGreaterThan(
			initial.pages.find((row) => row.id === page.id)?.revision ?? 0,
		);
		await db
			.updateTable("pages")
			.set({ status: "DRAFT" })
			.where("id", "=", page.id)
			.execute();
		const hidden = await fetchReaderCatalogSources();
		expect(hidden.pages[0].navigationRevision).toBeGreaterThan(
			edited.pages[0].navigationRevision,
		);
		expect(hidden.revision).toBeGreaterThan(edited.revision);
		expect(hidden.pages.find((row) => row.id === page.id)?.status).toBe(
			"DRAFT",
		);
	});
	it("段落の翻訳の編集・投票・削除を所属記事の更新として検出する", async () => {
		const user = await createUser();
		const page = await createPage({
			userId: user.id,
			slug: "article",
			status: "PUBLIC",
		});
		const segment = await createSegment({
			contentId: page.id,
			number: 0,
			text: "見出し",
			textAndOccurrenceHash: "title",
		});
		const translation = await db
			.insertInto("segmentTranslations")
			.values({
				segmentId: segment.id,
				userId: user.id,
				locale: "ja",
				text: "翻訳",
			})
			.returning("id")
			.executeTakeFirstOrThrow();
		let previous = await fetchReaderCatalogSources();
		for (const change of [{ text: "修正した翻訳" }, { point: 1 }]) {
			await db
				.updateTable("segmentTranslations")
				.set(change)
				.where("id", "=", translation.id)
				.execute();
			const current = await fetchReaderCatalogSources();
			expect(current.pages[0].navigationRevision).toBeGreaterThan(
				previous.pages[0].navigationRevision,
			);
			expect(current.pages[0].revision).toBeGreaterThan(
				previous.pages[0].revision,
			);
			previous = current;
		}
		await db
			.deleteFrom("segmentTranslations")
			.where("id", "=", translation.id)
			.execute();
		expect(
			(await fetchReaderCatalogSources()).pages[0].revision,
		).toBeGreaterThan(previous.pages[0].revision);
	});
	it("認証セッションの作成では公開HTMLの版を変更しない", async () => {
		const user = await createUser();
		const initial = await fetchReaderCatalogSources();
		await db
			.insertInto("sessions")
			.values({
				id: "session",
				token: "dummy-token",
				userId: user.id,
				expiresAt: new Date(Date.now() + 60000),
			})
			.execute();
		expect((await fetchReaderCatalogSources()).revision).toBe(initial.revision);
	});
});
