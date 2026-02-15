import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
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
				"published_at: 2024-01-01T09:00:00+09:00",
				"---",
				"",
				"# Hello World",
				"",
				"本文です。",
				"",
			].join("\n"),
			"utf8",
		);

		const files = await collectMarkdownFiles(dir);
		expect(files).toHaveLength(1);
		expect(files[0]).toEqual({
			slug: "hello-world",
			title: "Hello World",
			body: "本文です。\n",
			published_at: "2024-01-01T00:00:00.000Z",
		});
	});

	it("frontmatterが無いMarkdownは同期対象から除外する", async () => {
		const dir = await createTempDir();
		await writeFile(
			join(dir, "valid.md"),
			["---", "---", "", "# Valid", "", "本文です。", ""].join("\n"),
			"utf8",
		);
		await writeFile(join(dir, "README.md"), "# Not a page\n", "utf8");

		const files = await collectMarkdownFiles(dir);
		expect(files).toEqual([
			{
				slug: "valid",
				title: "Valid",
				body: "本文です。\n",
				published_at: null,
			},
		]);
	});

	it("frontmatterが無いMarkdown同士でslugが重複してもエラーにしない", async () => {
		const dir = await createTempDir();
		await mkdir(join(dir, "a"), { recursive: true });
		await mkdir(join(dir, "b"), { recursive: true });
		await writeFile(join(dir, "a", "README.md"), "# A\n", "utf8");
		await writeFile(join(dir, "b", "README.md"), "# B\n", "utf8");

		await writeFile(
			join(dir, "valid.md"),
			["---", "---", "", "# Valid", "", "本文です。", ""].join("\n"),
			"utf8",
		);

		const files = await collectMarkdownFiles(dir);
		expect(files).toEqual([
			{
				slug: "valid",
				title: "Valid",
				body: "本文です。\n",
				published_at: null,
			},
		]);
	});

	it("frontmatterがあるMarkdown同士でslugが重複するとエラーにする", async () => {
		const dir = await createTempDir();
		await mkdir(join(dir, "a"), { recursive: true });
		await mkdir(join(dir, "b"), { recursive: true });
		await writeFile(
			join(dir, "a", "dup.md"),
			["---", "---", "", "# A", "", "a", ""].join("\n"),
			"utf8",
		);
		await writeFile(
			join(dir, "b", "dup.md"),
			["---", "---", "", "# B", "", "b", ""].join("\n"),
			"utf8",
		);

		await expect(collectMarkdownFiles(dir)).rejects.toThrow(
			"Duplicate slug detected: dup",
		);
	});
});
