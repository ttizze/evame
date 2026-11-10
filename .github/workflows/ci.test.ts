// @vitest-environment node
import { execFileSync } from "node:child_process";
import {
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";

it("CIの成果物から環境ファイルと秘密値を除外し、実行に必要な隠しファイルも保持する", () => {
	const command = execFileSync(
		"bun",
		[
			"-e",
			`console.log(Bun.YAML.parse(await Bun.file(process.argv[1]).text()).jobs.build.steps.find(step => step.name === "Archive Workers build").run)`,
			fileURLToPath(new URL("./ci.yaml", import.meta.url)),
		],
		{ encoding: "utf8" },
	).trim();
	const directory = mkdtempSync(join(tmpdir(), "evame-archive-test-"));
	const secret = "dummy-ci-secret-only-for-archive-regression";
	const kept = [
		"dist/server/index.js",
		"dist/server/.vite/manifest.json",
		"reader/dist/client/article.js",
	];
	const excluded = [
		"dist/server/.dev.vars",
		"dist/server/.dev.vars.preview",
		"reader/dist/server/.dev.vars",
		"reader/dist/server/.env",
		"reader/dist/server/.env.production",
		"dist/server/nested/.env.local",
	];
	try {
		for (const path of [...kept, ...excluded]) {
			const file = join(directory, path);
			mkdirSync(dirname(file), { recursive: true });
			writeFileSync(
				file,
				excluded.includes(path) ? secret : "public-build-content",
			);
		}
		execFileSync("bash", ["-c", command], {
			cwd: directory,
			env: { ...process.env, RUNNER_TEMP: directory },
		});
		const archive = join(directory, "workers.tar");
		const members = execFileSync("tar", ["-tf", archive], {
			encoding: "utf8",
		}).split("\n");
		expect(readFileSync(archive).includes(Buffer.from(secret))).toBe(false);
		for (const path of excluded) expect(members).not.toContain(path);
		for (const path of kept) expect(members).toContain(path);
	} finally {
		rmSync(directory, { recursive: true, force: true });
	}
});
