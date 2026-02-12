import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import {
	CONFIG_FILE_NAME,
	CONTENT_DIR_CANDIDATES,
	EVAME_DIR_NAME,
} from "../utils/constants";
import { fileExists, isDirectory } from "../utils/filesystem";

export async function loadConfig(cwd: string) {
	// プロジェクト単位の設定は .evame/config.json に置く。
	const path = join(cwd, EVAME_DIR_NAME, CONFIG_FILE_NAME);
	const exists = await fileExists(path);
	if (!exists) {
		// 初回実行をゼロ設定にするため、一般的な候補ディレクトリを自動検出する。
		return { content_dir: await detectDefaultContentDir(cwd) };
	}

	const raw = await readFile(path, "utf8");
	const parsed = JSON.parse(raw) as { content_dir?: unknown };
	if (!parsed || typeof parsed !== "object") {
		throw new Error("Invalid config.json format.");
	}

	// 空文字は不正値として扱い、後方互換のため "." にフォールバックする。
	const contentDir =
		typeof parsed.content_dir === "string" && parsed.content_dir.trim() !== ""
			? parsed.content_dir
			: ".";
	return { content_dir: contentDir };
}

export async function loadOrCreateConfig(
	cwd: string,
): Promise<{ config: { content_dir: string }; created: boolean }> {
	// 既存設定がある場合は再作成せず、そのまま使用する。
	const exists = await fileExists(join(cwd, EVAME_DIR_NAME, CONFIG_FILE_NAME));
	if (exists) {
		return { config: await loadConfig(cwd), created: false };
	}
	// 初回のみ既定値を確定して保存する。
	const config = await loadConfig(cwd);
	await saveConfig(cwd, config);
	return { config, created: true };
}

export async function saveConfig(
	cwd: string,
	config: { content_dir: string },
): Promise<void> {
	const contentDir = config.content_dir.trim();
	if (!contentDir) {
		throw new Error("content_dir must not be empty.");
	}
	// 人間が編集しやすいよう整形JSON + 改行で保存する。
	await mkdir(join(cwd, EVAME_DIR_NAME), { recursive: true });
	await writeFile(
		join(cwd, EVAME_DIR_NAME, CONFIG_FILE_NAME),
		`${JSON.stringify({ content_dir: contentDir }, null, 2)}\n`,
		"utf8",
	);
}

async function detectDefaultContentDir(cwd: string): Promise<string> {
	// 優先順に候補を探索し、最初に存在するディレクトリを採用する。
	for (const candidate of CONTENT_DIR_CANDIDATES) {
		const absolute = resolve(cwd, candidate);
		if (await isDirectory(absolute)) {
			return candidate;
		}
	}
	return ".";
}
