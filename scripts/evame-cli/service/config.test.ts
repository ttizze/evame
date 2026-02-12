import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadConfig, loadOrCreateConfig, saveConfig } from "./config";

const tempDirs: string[] = [];

afterEach(async () => {
	await Promise.all(
		tempDirs.map((dir) => rm(dir, { recursive: true, force: true })),
	);
	tempDirs.length = 0;
});

async function createTempDir() {
	const dir = await mkdtemp(join(tmpdir(), "evame-cli-config-test-"));
	tempDirs.push(dir);
	return dir;
}

describe("evame-cli config", () => {
	it("config未作成かつarticlesがあると既定で ./articles を使う", async () => {
		const cwd = await createTempDir();
		await mkdir(join(cwd, "articles"), { recursive: true });
		const config = await loadConfig(cwd);
		expect(config).toEqual({ content_dir: "./articles" });
	});

	it("config未作成で候補ディレクトリが無い場合は '.' を使う", async () => {
		const cwd = await createTempDir();
		const config = await loadConfig(cwd);
		expect(config).toEqual({ content_dir: "." });
	});

	it("configを保存すると読み出せる", async () => {
		const cwd = await createTempDir();
		await saveConfig(cwd, { content_dir: "./articles" });
		const config = await loadConfig(cwd);
		expect(config).toEqual({ content_dir: "./articles" });
		const raw = await readFile(join(cwd, ".evame", "config.json"), "utf8");
		expect(raw).toContain('"content_dir": "./articles"');
	});

	it("config未作成なら既定値で作成して返す", async () => {
		const cwd = await createTempDir();
		await mkdir(join(cwd, "articles"), { recursive: true });

		const result = await loadOrCreateConfig(cwd);

		expect(result).toEqual({
			config: { content_dir: "./articles" },
			created: true,
		});
		await expect(
			readFile(join(cwd, ".evame", "config.json"), "utf8"),
		).resolves.toContain('"content_dir": "./articles"');
	});

	it("config作成済みならそのまま返す", async () => {
		const cwd = await createTempDir();
		await saveConfig(cwd, { content_dir: "./posts" });

		const result = await loadOrCreateConfig(cwd);

		expect(result).toEqual({
			config: { content_dir: "./posts" },
			created: false,
		});
	});
});
