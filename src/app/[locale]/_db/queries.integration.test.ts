import { beforeEach, describe, expect, it } from "vitest";
import { resetDatabase } from "@/tests/db-helpers";
import { createPage, createUser } from "@/tests/factories";
import { setupDbPerFile } from "@/tests/test-db-manager";
import { queryPageDetail } from "./queries";

await setupDbPerFile(import.meta.url);

describe("queryPageDetail", () => {
	beforeEach(async () => {
		await resetDatabase();
	});

	it("非公開のTipiṭaka祖先を持つPUBLICページは直URLでも取得しない", async () => {
		const user = await createUser({ handle: "evame" });
		const root = await createPage({
			publishedAt: new Date("2026-01-01T00:00:00.000Z"),
			slug: "tipitaka",
			status: "ARCHIVE",
			userId: user.id,
		});
		const hiddenParent = await createPage({
			parentId: root.id,
			slug: "hidden-parent",
			status: "DRAFT",
			userId: user.id,
		});
		await createPage({
			parentId: hiddenParent.id,
			slug: "public-child",
			status: "PUBLIC",
			userId: user.id,
		});

		await expect(queryPageDetail("public-child", "ja")).resolves.toBeNull();
	});
});
