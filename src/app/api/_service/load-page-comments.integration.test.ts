import { beforeEach, expect, it } from "vitest";
import { db } from "@/db";
import { resetDatabase } from "@/tests/db-helpers";
import {
	createPage,
	createPageComment,
	createSegment,
	createUser,
} from "@/tests/factories";
import { setupDbPerFile } from "@/tests/test-db-manager";
import { loadPageComments } from "./load-page-comments";

await setupDbPerFile(import.meta.url);
beforeEach(resetDatabase);

it("コメント受付を止めても既存コメントの本文・件数を返し、受付状態も返す", async () => {
	const user = await createUser();
	const page = await createPage({ userId: user.id, slug: "closed-comments" });
	const comment = await createPageComment({ userId: user.id, pageId: page.id });
	await createSegment({
		contentId: comment.id,
		number: 1,
		text: "残すコメント",
		textAndOccurrenceHash: "existing-comment",
	});
	await db
		.updateTable("pages")
		.set({ commentsEnabled: false })
		.where("id", "=", page.id)
		.execute();
	const result = await loadPageComments(page.id, "ja", 1, new Headers());
	expect(result.commentsEnabled).toBe(false);
	expect(result.count).toBe(1);
	expect(result.comments).toHaveLength(1);
	expect(result.comments[0].id).toBe(comment.id);
});
