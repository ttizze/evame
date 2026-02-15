import { beforeEach, describe, expect, it } from "vitest";
import { markdownToMdastWithSegments } from "@/app/[locale]/_domain/markdown-to-mdast-with-segments";
import { mdastToMarkdown } from "@/app/[locale]/_domain/mdast-to-markdown";
import { computeRevision } from "@/app/api/sync/_domain/compute-revision";
import { db } from "@/db";
import type { JsonValue } from "@/db/types";
import { resetDatabase } from "@/tests/db-helpers";
import {
	createPage,
	createPageWithSegments,
	createSegments,
	createUser,
} from "@/tests/factories";
import { setupDbPerFile } from "@/tests/test-db-manager";
import { buildJudgments } from "./_service/build-judgments";
import { executePush } from "./_service/execute-push";
import type { SyncPushInput } from "./_service/schema";

await setupDbPerFile(import.meta.url);

async function push(userId: string, data: SyncPushInput) {
	const judgments = await buildJudgments(userId, data);
	return executePush(userId, judgments, { dryRun: data.dry_run });
}

describe("Push API (service layer)", () => {
	let userId: string;

	beforeEach(async () => {
		await resetDatabase();
		const user = await createUser();
		userId = user.id;
	});

	it("新規ページをpushするとappliedで作成される", async () => {
		const result = await push(userId, {
			inputs: [
				{
					slug: "new-post",
					expected_revision: null,
					title: "New Post",
					body: "Hello world",
					published_at: new Date("2024-01-01T00:00:00Z"),
				},
			],
		});

		expect(result.status).toBe("applied");
		expect(result.createdCount).toBe(1);
		expect(result.results).toHaveLength(1);
		expect(result.results[0].action).toBe("AUTO_APPLY");
		expect(result.results[0].detail).toBe("UPSERT");
		expect(result.results[0].applied_revision).toMatch(/^[0-9a-f]{64}$/);

		const page = await db
			.selectFrom("pages")
			.selectAll()
			.where("slug", "=", "new-post")
			.executeTakeFirst();
		expect(page).toBeDefined();
		expect(page?.status).toBe("PUBLIC");
	});

	it("既存ページをexpected一致で更新するとappliedになる", async () => {
		const createResult = await push(userId, {
			inputs: [
				{
					slug: "existing-post",
					expected_revision: null,
					title: "Original",
					body: "Original body",
				},
			],
		});
		const revision = createResult.results[0].applied_revision!;

		const updateResult = await push(userId, {
			inputs: [
				{
					slug: "existing-post",
					expected_revision: revision,
					title: "Updated",
					body: "Updated body",
				},
			],
		});

		expect(updateResult.status).toBe("applied");
		expect(updateResult.results[0].action).toBe("AUTO_APPLY");
		expect(updateResult.results[0].applied_revision).not.toBe(revision);
	});

	it("競合が1件でもある場合は全体を適用せずconflictになる", async () => {
		const first = await push(userId, {
			inputs: [
				{
					slug: "ok-post",
					expected_revision: null,
					title: "OK",
					body: "OK body",
				},
				{
					slug: "conflict-post",
					expected_revision: null,
					title: "Conflict",
					body: "Conflict body",
				},
			],
		});

		const okRevision = first.results.find(
			(r) => r.slug === "ok-post",
		)?.applied_revision;
		expect(okRevision).toBeTruthy();

		const before = await db
			.selectFrom("pages")
			.select(["mdastJson"])
			.where("slug", "=", "ok-post")
			.executeTakeFirstOrThrow();
		const beforeBody = mdastToMarkdown(before.mdastJson as JsonValue);

		const result = await push(userId, {
			inputs: [
				{
					slug: "ok-post",
					expected_revision: okRevision!,
					title: "OK Updated",
					body: "OK body updated",
				},
				{
					slug: "conflict-post",
					expected_revision: "wrong-revision",
					title: "Conflict Updated",
					body: "Conflict body updated",
				},
			],
		});

		expect(result.status).toBe("conflict");
		expect(result.results).toHaveLength(1);
		expect(result.results[0]).toMatchObject({
			slug: "conflict-post",
			action: "CONFLICT",
			reason: "revision_mismatch",
		});

		const after = await db
			.selectFrom("pages")
			.select(["mdastJson"])
			.where("slug", "=", "ok-post")
			.executeTakeFirstOrThrow();
		const afterBody = mdastToMarkdown(after.mdastJson as JsonValue);
		expect(afterBody).toBe(beforeBody);
	});

	it("全件競合ならconflictになる", async () => {
		await push(userId, {
			inputs: [
				{
					slug: "conflict-only",
					expected_revision: null,
					title: "Original",
					body: "Original body",
				},
			],
		});

		const result = await push(userId, {
			inputs: [
				{
					slug: "conflict-only",
					expected_revision: "wrong-revision",
					title: "Conflict",
					body: "Conflict body",
				},
			],
		});

		expect(result.status).toBe("conflict");
		expect(result.results[0]).toMatchObject({
			action: "CONFLICT",
			reason: "revision_mismatch",
		});
	});

	it("dry_runでは判定だけ返しDBは変更されない", async () => {
		const result = await push(userId, {
			dry_run: true,
			inputs: [
				{
					slug: "dry-run-post",
					expected_revision: null,
					title: "Dry Run",
					body: "Dry run body",
				},
			],
		});

		expect(result.status).toBe("applied");
		expect(result.results[0]).toMatchObject({
			action: "AUTO_APPLY",
			detail: "UPSERT",
		});

		const page = await db
			.selectFrom("pages")
			.selectAll()
			.where("slug", "=", "dry-run-post")
			.executeTakeFirst();
		expect(page).toBeUndefined();
	});

	it("同じ内容を再送するとno_changeになる", async () => {
		const created = await push(userId, {
			inputs: [
				{
					slug: "same-post",
					expected_revision: null,
					title: "Same",
					body: "Same body",
				},
			],
		});
		const revision = created.results[0].applied_revision!;

		const result = await push(userId, {
			inputs: [
				{
					slug: "same-post",
					expected_revision: revision,
					title: "Same",
					body: "Same body",
				},
			],
		});

		expect(result.status).toBe("no_change");
		expect(result.results[0].action).toBe("NO_CHANGE");
	});

	it("pullのrevision（legacy）とcanonical化後のrevisionが違っても、内容が同じならno_changeになる", async () => {
		const slug = "legacy-revision-post";
		const legacyTitle = "Title\n";
		const legacyBody = "*使ったモデル:&#x20;****o3***\\\n続き\n";
		const publishedAt = null;

		const page = await createPage({
			userId,
			slug,
			status: "PUBLIC",
			// jsonb カラムなので、テキストをそのまま入れたい場合は JSON 文字列として保存する。
			mdastJson: JSON.stringify(legacyBody),
			publishedAt,
		});
		await createSegments({
			contentId: page.id,
			segments: [
				{
					number: 0,
					text: legacyTitle,
					textAndOccurrenceHash: "h-0",
					segmentTypeKey: "PRIMARY",
				},
			],
		});

		const legacyRevision = computeRevision({
			slug,
			title: legacyTitle,
			body: legacyBody,
			publishedAt,
		});

		const { mdastJson } = await markdownToMdastWithSegments({
			header: legacyTitle.trim(),
			markdown: legacyBody,
			autoUploadImages: false,
		});
		const canonicalBody = mdastToMarkdown(mdastJson);
		const canonicalRevision = computeRevision({
			slug,
			title: legacyTitle.trim(),
			body: canonicalBody,
			publishedAt,
		});
		expect(canonicalRevision).not.toBe(legacyRevision);

		const result = await push(userId, {
			inputs: [
				{
					slug,
					expected_revision: legacyRevision,
					title: legacyTitle.trim(),
					body: legacyBody,
					published_at: null,
				},
			],
		});
		expect(result.status).toBe("no_change");
		expect(result.results[0].action).toBe("NO_CHANGE");
	});

	it("ARCHIVEページへのpushは競合になる", async () => {
		await createPageWithSegments({
			userId,
			slug: "archived-post",
			status: "ARCHIVE",
			segments: [
				{
					number: 0,
					text: "Archived",
					textAndOccurrenceHash: "h-0",
					segmentTypeKey: "PRIMARY",
				},
			],
		});

		const result = await push(userId, {
			inputs: [
				{
					slug: "archived-post",
					expected_revision: null,
					title: "Revive",
					body: "new body",
				},
			],
		});

		expect(result.status).toBe("conflict");
		expect(result.results[0]).toMatchObject({
			action: "CONFLICT",
			reason: "archived_page",
		});
	});
});
