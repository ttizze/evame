import { beforeEach, describe, expect, it } from "vitest";
import { resetDatabase } from "@/tests/db-helpers";
import {
	createPage,
	createPersonalAccessToken,
	createUser,
} from "@/tests/factories";
import { setupDbPerFile } from "@/tests/test-db-manager";
import { buildJudgments } from "../push/_service/build-judgments";
import { executePush } from "../push/_service/execute-push";
import type { SyncPushInput } from "../push/_service/schema";
import { GET } from "./route";

await setupDbPerFile(import.meta.url);

async function push(userId: string, data: SyncPushInput) {
	const judgments = await buildJudgments(userId, data);
	return executePush(userId, judgments, { dryRun: data.dry_run });
}

describe("Pull API", () => {
	let userId: string;
	let authHeader: string;

	beforeEach(async () => {
		await resetDatabase();
		const user = await createUser();
		userId = user.id;
		const { plainKey } = await createPersonalAccessToken({ userId });
		authHeader = `Bearer ${plainKey}`;
	});

	it("ページを取得するとmarkdown形式のbodyを返す", async () => {
		await push(userId, {
			inputs: [
				{
					slug: "body-post",
					expected_revision: null,
					title: "Body Post",
					body: "これは本文です。\n\n- item1\n- item2",
				},
			],
		});

		const response = await GET(
			new Request("http://localhost/api/sync/pull", {
				headers: { Authorization: authHeader },
			}),
		);
		expect(response.status).toBe(200);
		const json = await response.json();

		expect(json.pages).toHaveLength(1);
		expect(json.pages[0].slug).toBe("body-post");
		expect(json.pages[0].body).toContain("これは本文です。");
		expect(typeof json.pages[0].revision).toBe("string");
	});

	it("titleはsegment#0のテキストを返す", async () => {
		await push(userId, {
			inputs: [
				{
					slug: "title-post",
					expected_revision: null,
					title: "Segment Zero Title",
					body: "text",
				},
			],
		});

		const response = await GET(
			new Request("http://localhost/api/sync/pull", {
				headers: { Authorization: authHeader },
			}),
		);
		expect(response.status).toBe(200);
		const json = await response.json();

		expect(json.pages[0].title).toBe("Segment Zero Title");
	});

	it("ARCHIVEページは結果に含まれない", async () => {
		await createPage({
			userId,
			slug: "archived-post",
			status: "ARCHIVE",
		});

		const response = await GET(
			new Request("http://localhost/api/sync/pull", {
				headers: { Authorization: authHeader },
			}),
		);
		expect(response.status).toBe(200);
		const json = await response.json();
		expect(json.pages).toHaveLength(0);
	});
});
