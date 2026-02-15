import { chmod, mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { clearAuthToken, loadAuthToken, saveAuthToken } from "./auth";

const tempDirs: string[] = [];

afterEach(async () => {
	await Promise.all(
		tempDirs.map((dir) => rm(dir, { recursive: true, force: true })),
	);
	tempDirs.length = 0;
});

async function createTempDir() {
	const dir = await mkdtemp(join(tmpdir(), "evame-cli-auth-test-"));
	tempDirs.push(dir);
	return dir;
}

describe("evame-cli auth", () => {
	it("authトークンはXDG_CONFIG_HOME配下に保存/読込/削除できる", async () => {
		const cwd = await createTempDir();
		const env: NodeJS.ProcessEnv = {
			...process.env,
			XDG_CONFIG_HOME: join(cwd, "xdg"),
		};
		const authPath = join(cwd, "xdg", "evame", "auth.json");

		await saveAuthToken("token-from-file", env);
		expect(await readFile(authPath, "utf8")).toContain(
			'"token": "token-from-file"',
		);
		await expect(loadAuthToken(env)).resolves.toBe("token-from-file");

		await clearAuthToken(env);
		await expect(loadAuthToken(env)).rejects.toThrow("No auth token found");
	});

	it("EVAME_PAT がある場合はauthファイルより優先する", async () => {
		const cwd = await createTempDir();
		const env: NodeJS.ProcessEnv = {
			...process.env,
			XDG_CONFIG_HOME: join(cwd, "xdg"),
		};

		await saveAuthToken("token-from-file", env);
		const token = await loadAuthToken({
			...env,
			EVAME_PAT: "token-from-env",
		});
		expect(token).toBe("token-from-env");
	});

	it("XDG_CONFIG_HOME がない場合は HOME/.config 配下を使う", async () => {
		const cwd = await createTempDir();
		const env: NodeJS.ProcessEnv = {
			...process.env,
			// CI環境などで XDG_CONFIG_HOME がセットされていても、
			// このテストケースでは「未設定」を明示してフォールバック挙動を検証する。
			XDG_CONFIG_HOME: undefined,
			HOME: join(cwd, "home"),
		};
		await saveAuthToken("token-from-file", env);
		await expect(loadAuthToken(env)).resolves.toBe("token-from-file");
		const raw = await readFile(
			join(cwd, "home", ".config", "evame", "auth.json"),
			"utf8",
		);
		expect(raw).toContain('"token": "token-from-file"');
	});

	it("authファイルはPOSIX環境で0600相当に固定される", async () => {
		if (process.platform === "win32") return;
		const cwd = await createTempDir();
		const env: NodeJS.ProcessEnv = {
			...process.env,
			XDG_CONFIG_HOME: join(cwd, "xdg"),
		};

		await saveAuthToken("token-from-file", env);
		const authPath = join(cwd, "xdg", "evame", "auth.json");
		const mode = (await stat(authPath)).mode & 0o777;
		expect(mode & 0o077).toBe(0);
	});

	it("authファイルが緩い権限でも読み込み時に0600へ修復する", async () => {
		if (process.platform === "win32") return;
		const cwd = await createTempDir();
		const env: NodeJS.ProcessEnv = {
			...process.env,
			XDG_CONFIG_HOME: join(cwd, "xdg"),
		};

		await saveAuthToken("token-from-file", env);
		const authPath = join(cwd, "xdg", "evame", "auth.json");
		await chmod(authPath, 0o644);

		await expect(loadAuthToken(env)).resolves.toBe("token-from-file");
		const mode = (await stat(authPath)).mode & 0o777;
		expect(mode & 0o077).toBe(0);
	});
});
