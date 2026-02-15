import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { applyPullResultToLocal } from "./state";

const tempDirs: string[] = [];

afterEach(async () => {
	await Promise.all(
		tempDirs.map((dir) => rm(dir, { recursive: true, force: true })),
	);
	tempDirs.length = 0;
});

async function createTempDir() {
	const dir = await mkdtemp(join(tmpdir(), "evame-cli-state-test-"));
	tempDirs.push(dir);
	return dir;
}

describe("evame-cli state", () => {
	it("pullでforce=false時は差分ファイルをスキップしてstateを更新する", async () => {
		const cwd = await createTempDir();
		const contentDir = join(cwd, "articles");
		await mkdir(contentDir, { recursive: true });

		await writeFile(
			join(contentDir, "keep-post.md"),
			["---", "---", "", "# ローカル編集", "", "local", ""].join("\n"),
			"utf8",
		);

		const pages = [
			{
				slug: "keep-post",
				title: "サーバー版",
				body: "server",
				published_at: null,
				revision: "server-keep-rev",
			},
			{
				slug: "new-post",
				title: "New",
				body: "new body",
				published_at: "2024-01-01T00:00:00.000Z",
				revision: "server-new-rev",
			},
		];

		const initialState = {
			slugs: {
				"keep-post": { last_applied_revision: "old-keep-rev" },
				"gone-post": { last_applied_revision: "old-gone-rev" },
			},
		};

		const result = await applyPullResultToLocal({
			contentDir,
			pages,
			force: false,
			state: initialState,
		});

		expect(result.skippedSlugs).toEqual(["keep-post"]);
		expect(result.writtenSlugs).toEqual(["new-post"]);
		expect(result.nextState).toEqual({
			slugs: {
				"keep-post": { last_applied_revision: "old-keep-rev" },
				"new-post": { last_applied_revision: "server-new-rev" },
			},
		});

		const keptContent = await readFile(
			join(contentDir, "keep-post.md"),
			"utf8",
		);
		expect(keptContent).toContain("ローカル編集");

		const newContent = await readFile(join(contentDir, "new-post.md"), "utf8");
		expect(newContent).toContain("# New");
		expect(newContent).toContain('published_at: "2024-01-01T00:00:00.000Z"');
		expect(newContent).not.toContain("title:");
	});
});
