import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { collectMarkdownFiles } from "./markdown";

const tempDirs: string[] = [];

afterEach(async () => {
	await Promise.all(
		tempDirs.map((dir) => rm(dir, { recursive: true, force: true })),
	);
	tempDirs.length = 0;
});

async function createTempDir() {
	const dir = await mkdtemp(join(tmpdir(), "evame-cli-markdown-test-"));
	tempDirs.push(dir);
	return dir;
}

describe("evame-cli markdown", () => {
	it("Markdownファイルからslug/title/body/published_atを抽出できる", async () => {
		const dir = await createTempDir();
		await writeFile(
			join(dir, "hello-world.md"),
			[
				"---",
				'title: "Hello World"',
				"published_at: 2024-01-01T09:00:00+09:00",
				"---",
				"",
				"本文です。",
				"",
			].join("\n"),
			"utf8",
		);

		const collected = await collectMarkdownFiles(dir);
		expect(collected.skippedNoFrontmatterCount).toBe(0);
		expect(collected.files).toHaveLength(1);
		expect(collected.files[0]).toEqual({
			slug: "hello-world",
			title: "Hello World",
			body: "本文です。\n",
			published_at: "2024-01-01T00:00:00.000Z",
		});
	});

	it("frontmatterが無いファイルは同期対象から除外する", async () => {
		const dir = await createTempDir();
		await writeFile(join(dir, "no-frontmatter.md"), "# hello\n", "utf8");
		await writeFile(
			join(dir, "with-frontmatter.md"),
			["---", 'title: "With frontmatter"', "---", "", "本文です。", ""].join(
				"\n",
			),
			"utf8",
		);

		const collected = await collectMarkdownFiles(dir);
		expect(collected.files).toHaveLength(1);
		expect(collected.files[0]?.slug).toBe("with-frontmatter");
		expect(collected.skippedNoFrontmatterCount).toBe(1);
	});
});
