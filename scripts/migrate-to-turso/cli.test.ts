import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const cliPath = resolve(process.cwd(), "scripts/migrate-to-turso/cli.ts");

describe("migrate-to-turso CLI", () => {
	it("引数エラー時は秘密を含まない固定文面だけをstderrへ出す", () => {
		const result = spawnSync(process.execPath, [cliPath, "--batch-size", "0"], {
			encoding: "utf8",
			env: {
				PATH: process.env.PATH,
				NODE_ENV: "test",
				DATABASE_URL:
					"postgres://user:password@example.test/db?authToken=auth-secret",
				TURSO_AUTH_TOKEN: "turso-secret",
				GEMINI_API_KEY: "gemini-secret",
			},
		});

		expect(result.status).toBe(1);
		expect(result.stdout).toBe("");
		expect(result.stderr).toBe("Migration failed\n");
		expect(result.stderr).not.toContain("password");
		expect(result.stderr).not.toContain("auth-secret");
		expect(result.stderr).not.toContain("turso-secret");
		expect(result.stderr).not.toContain("gemini-secret");
	});
});
