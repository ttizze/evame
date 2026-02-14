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

		const files = await collectMarkdownFiles(dir);
		expect(files).toHaveLength(1);
		expect(files[0]).toEqual({
			slug: "hello-world",
			title: "Hello World",
			body: "本文です。\n",
			published_at: "2024-01-01T00:00:00.000Z",
		});
	});

	it("frontmatterが無くても先頭の # 見出しをタイトルとして扱う", async () => {
		const dir = await createTempDir();
		await writeFile(
			join(dir, "hello.md"),
			["# 見出しタイトル", "", "本文です。", ""].join("\n"),
			"utf8",
		);

		const files = await collectMarkdownFiles(dir);
		expect(files).toHaveLength(1);
		expect(files[0]).toEqual({
			slug: "hello",
			title: "見出しタイトル",
			body: "本文です。\n",
			published_at: null,
		});
	});

	it("# 見出しが無い場合は最初の一文をタイトルにする", async () => {
		const dir = await createTempDir();
		await writeFile(
			join(dir, "hello.md"),
			["これは最初の一文です。これは二文目です。", ""].join("\n"),
			"utf8",
		);

		const files = await collectMarkdownFiles(dir);
		expect(files).toHaveLength(1);
		expect(files[0]).toEqual({
			slug: "hello",
			title: "これは最初の一文です。",
			body: "これは最初の一文です。これは二文目です。\n",
			published_at: null,
		});
	});
});
