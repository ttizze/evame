import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { AUTH_DIR_NAME, AUTH_FILE_NAME } from "../utils/constants";
import { fileExists } from "../utils/filesystem";

// 認証ファイルを配置するディレクトリを環境変数から決定する。
function resolveAuthDirPath(env: NodeJS.ProcessEnv): string {
	// XDG を優先し、未設定時は HOME 配下へフォールバックする。
	const xdgConfigHome = env.XDG_CONFIG_HOME?.trim();
	if (xdgConfigHome) {
		return join(xdgConfigHome, AUTH_DIR_NAME);
	}
	return join(env.HOME?.trim() || homedir(), ".config", AUTH_DIR_NAME);
}

export function resolveAuthFilePath(env: NodeJS.ProcessEnv): string {
	return join(resolveAuthDirPath(env), AUTH_FILE_NAME);
}

export async function saveAuthToken(
	token: string,
	env: NodeJS.ProcessEnv = process.env,
): Promise<void> {
	if (!token.trim()) {
		throw new Error("Token must not be empty.");
	}
	// 親ディレクトリが無くても保存できるよう事前に作成する。
	const authDirPath = resolveAuthDirPath(env);
	await mkdir(authDirPath, { recursive: true });
	await writeFile(
		resolveAuthFilePath(env),
		`${JSON.stringify({ token: token.trim() }, null, 2)}\n`,
		"utf8",
	);
}

export async function clearAuthToken(
	env: NodeJS.ProcessEnv = process.env,
): Promise<void> {
	// ログアウト時は存在有無を問わず安全に削除する。
	await rm(resolveAuthFilePath(env), { force: true });
}

export async function loadAuthToken(
	env: NodeJS.ProcessEnv = process.env,
): Promise<string> {
	// CI や一時実行を優先するため、環境変数を最優先で使う。
	const fromEnv = env.EVAME_PAT?.trim();
	if (fromEnv) {
		return fromEnv;
	}

	// 環境変数が無い場合のみローカル保存ファイルを参照する。
	const authPath = resolveAuthFilePath(env);
	const exists = await fileExists(authPath);
	if (!exists) {
		throw new Error("No auth token found. Set EVAME_PAT or run `evame login`.");
	}

	const raw = await readFile(authPath, "utf8");
	const parsed = JSON.parse(raw) as { token?: unknown };
	if (!parsed || typeof parsed.token !== "string" || !parsed.token.trim()) {
		throw new Error("Invalid auth.json format.");
	}
	// 余分な空白を落として返す。
	return parsed.token.trim();
}
