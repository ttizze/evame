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
	it("published_atを持つファイルだけを同期対象として収集する", async () => {
		const dir = await createTempDir();
		await writeFile(
			join(dir, "sync.md"),
			[
				"---",
				"published_at: null",
				"---",
				"",
				"# タイトル",
				"",
				"本文です。",
				"",
			].join("\n"),
			"utf8",
		);
		await writeFile(
			join(dir, "ignore.md"),
			["# 無視", "", "本文です。", ""].join("\n"),
			"utf8",
		);

		const files = await collectMarkdownFiles(dir);
		expect(files).toHaveLength(1);
		expect(files[0]).toEqual({
			slug: "sync",
			title: "タイトル",
			body: "本文です。\n",
			published_at: null,
		});
	});

	it("frontmatterのtitleは無視し、本文の # 見出しをタイトルとして扱う", async () => {
		const dir = await createTempDir();
		await writeFile(
			join(dir, "hello-world.md"),
			[
				"---",
				'title: "Hello World"',
				"published_at: 2024-01-01T09:00:00+09:00",
				"---",
				"",
				"# 見出しタイトル",
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
			title: "見出しタイトル",
			body: "本文です。\n",
			published_at: "2024-01-01T00:00:00.000Z",
		});
	});

	it("# 見出しが無い場合は冒頭の1行をタイトルにする", async () => {
		const dir = await createTempDir();
		await writeFile(
			join(dir, "hello.md"),
			[
				"---",
				"published_at: null",
				"---",
				"",
				"これは最初の一文です。これは二文目です。",
				"",
			].join("\n"),
			"utf8",
		);

		const files = await collectMarkdownFiles(dir);
		expect(files).toHaveLength(1);
		expect(files[0]).toEqual({
			slug: "hello",
			title: "これは最初の一文です。これは二文目です。",
			body: "これは最初の一文です。これは二文目です。\n",
			published_at: null,
		});
	});

	it("本文が空なら無視する", async () => {
		const dir = await createTempDir();
		await writeFile(
			join(dir, "empty.md"),
			["---", "published_at: null", "---"].join("\n"),
			"utf8",
		);

		const files = await collectMarkdownFiles(dir);
		expect(files).toEqual([]);
	});
});
