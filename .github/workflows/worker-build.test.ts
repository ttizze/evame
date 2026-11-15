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

it("単一Workerの配信成果物だけを保存し、環境ファイルと秘密値を含めない", () => {
	const command = execFileSync(
		"bun",
		[
			"-e",
			`console.log(Bun.YAML.parse(await Bun.file(process.argv[1]).text()).jobs.build.steps.find(step => step.name === "Archive Workers build").run)`,
			fileURLToPath(new URL("./ci.yaml", import.meta.url)),
		],
		{ encoding: "utf8" },
	).trim();
	const directory = mkdtempSync(join(tmpdir(), "evame-worker-build-"));
	const secret = "dummy-secret-for-archive-test";
	const kept = [
		"dist/server/index.js",
		"dist/client/_astro/article.js",
		"dist/server/wrangler.json",
		".data/browser-test.db",
	];
	const excluded = [
		"dist/server/.dev.vars",
		"dist/server/.env.preview",
		"reader/dist/server/entry.mjs",
	];
	try {
		for (const path of [...kept, ...excluded]) {
			const file = join(directory, path);
			mkdirSync(dirname(file), { recursive: true });
			writeFileSync(file, excluded.includes(path) ? secret : "build-content");
		}
		execFileSync("bash", ["-c", command], {
			cwd: directory,
			env: { ...process.env, RUNNER_TEMP: directory },
		});
		const archive = join(directory, "workers.tar");
		const members = execFileSync("tar", ["-tf", archive], {
			encoding: "utf8",
		}).split("\n");
		for (const path of kept) expect(members).toContain(path);
		for (const path of excluded) expect(members).not.toContain(path);
		expect(readFileSync(archive).includes(Buffer.from(secret))).toBe(false);
	} finally {
		rmSync(directory, { recursive: true, force: true });
	}
});
