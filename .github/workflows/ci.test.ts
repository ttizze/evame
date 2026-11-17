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

const workflows = JSON.parse(
	execFileSync(
		"bun",
		[
			"-e",
			`console.log(JSON.stringify(await Promise.all(process.argv.slice(1).map(async path => Bun.YAML.parse(await Bun.file(path).text())))))`,
			fileURLToPath(new URL("./ci.yaml", import.meta.url)),
			fileURLToPath(new URL("./ios.yml", import.meta.url)),
		],
		{ encoding: "utf8" },
	),
);

it("ChromiumとWebKitで全エディター操作群とAstroの公開表示を検証する", () => {
	const browser = workflows[0].jobs.browser;
	expect(browser.needs).toBe("build");
	expect(browser.strategy["fail-fast"]).toBe(false);
	expect(browser.strategy.matrix.browser).toEqual(["chromium", "webkit"]);
	expect(browser.strategy.matrix.suite).toEqual([
		"editor-drag",
		"editor-lists-clipboard",
		"editor-lists-structure",
		"editor-lists-formatting",
		"header",
		"article",
	]);
	expect(browser.strategy.matrix.include).toEqual([
		{ suite: "reader", browser: "chromium" },
	]);
	expect(browser.env.EVAME_BROWSER_TYPE).toMatch(
		/^\$\{\{ matrix\.browser \}\}$/,
	);
	expect(
		browser.steps.find((step: { uses: string }) =>
			step.uses?.startsWith("actions/download-artifact@"),
		).with.name,
	).toBe("workers");
	expect(
		browser.steps.find(
			(step: { name: string }) =>
				step.name === "Run prebuilt browsers with the Nix toolchain",
		).run,
	).toContain("--env EVAME_BROWSER_TYPE");
});

it("ブラウザー失敗のトレースをホストと同じ所有者で作り、失敗後もアップロードする", () => {
	const browser = workflows[0].jobs.browser;
	const command = browser.steps.find(
		(step: { name: string }) =>
			step.name === "Run prebuilt browsers with the Nix toolchain",
	).run;
	expect(command).toContain('--user "$(id -u):$(id -g)"');
	expect(command).toContain("--env DEBUG");
	expect(browser.env.DEBUG).toBe("pw:browser");
	const artifact = browser.steps.find(
		(step: { name: string }) => step.name === "Upload browser failure traces",
	);
	expect(artifact.if).toBe("always()");
	expect(artifact.uses).toMatch(/^actions\/upload-artifact@/);
	expect(artifact.with.path).toBe(".data/header-browser");
	expect(artifact.with["include-hidden-files"]).toBe(true);
});

it("失敗・キャンセル・スキップした検証が一つでもあれば公開とプレビューを止める", () => {
	const workflow = workflows[0];
	const gate = workflow.jobs["ci-check"];
	expect(gate.needs).toEqual([
		"lint",
		"typecheck",
		"test-results",
		"build",
		"browser",
	]);
	expect(gate.if).toBe("always()");
	for (const status of ["success", "failure", "cancelled", "skipped"]) {
		for (const failed of [
			"LINT_RESULT",
			"TYPECHECK_RESULT",
			"TEST_RESULT",
			"BUILD_RESULT",
			"BROWSER_RESULT",
		]) {
			const run = () =>
				execFileSync("bash", ["-c", gate.steps[0].run], {
					env: {
						...process.env,
						LINT_RESULT: "success",
						TYPECHECK_RESULT: "success",
						TEST_RESULT: "success",
						BUILD_RESULT: "success",
						BROWSER_RESULT: "success",
						[failed]: status,
					},
				});
			if (status === "success") expect(run).not.toThrow();
			else expect(run).toThrow();
		}
	}
	expect(workflow.jobs.preview.needs).toEqual(["ci-check", "preview-build"]);
	expect(
		gate.steps.findIndex(
			(step: { name: string }) => step.name === "Deploy Cloudflare Workers",
		),
	).toBeGreaterThan(0);
});

it("lint・型検査・ビルドと並行し、計測入力の確定だけを待って4分割テストを開始する", () => {
	const jobs = workflows[0].jobs;
	for (const name of ["lint", "typecheck", "build"]) {
		expect(jobs[name].needs).toBeUndefined();
		expect(
			jobs[name].steps.some((step: { run: string }) =>
				step.run?.includes("bun install --frozen-lockfile"),
			),
		).toBe(true);
	}
	expect(jobs["test-snapshot"]).toBeDefined();
	expect(jobs["test-snapshot"].needs).toBeUndefined();
	expect(jobs.test.needs).toBe("test-snapshot");
	expect(jobs.test.strategy.matrix.shard).toEqual([1, 2, 3, 4]);
	expect(jobs.test.strategy["fail-fast"]).toBe(false);
	expect(
		jobs.test.steps.some((step: { run: string }) =>
			step.run?.includes("scripts/ci-tests.mjs"),
		),
	).toBe(true);
	expect(jobs.test.steps[0].with["fetch-depth"]).toBe(0);
	expect(
		jobs.test.steps.find((step: { uses: string }) =>
			step.uses?.startsWith("actions/upload-artifact@"),
		).with["include-hidden-files"],
	).toBe(true);
	expect(
		jobs.test.steps.find((step: { uses: string }) =>
			step.uses?.startsWith("actions/upload-artifact@"),
		).with.overwrite,
	).toBe(true);
});

it("全シャードが同じ確定済み実測を使い、4件の結果を検証してから次回へ渡す", () => {
	const jobs = workflows[0].jobs;
	const snapshot = jobs["test-snapshot"];
	expect(snapshot).toBeDefined();
	const restore = snapshot.steps.find(
		(step: { name: string }) => step.name === "Restore test duration snapshot",
	);
	const aggregate = jobs["test-results"];
	expect(restore.uses).toBe("actions/cache/restore@v5");
	expect(restore.with["restore-keys"]).toBeUndefined();
	expect(restore.with.path).toBe(".data/ci-test-durations.json");
	expect(restore.with.key).toContain(
		"github.event.pull_request.base.sha || github.event.before || github.sha",
	);
	const upload = snapshot.steps.find((step: { uses: string }) =>
		step.uses?.startsWith("actions/upload-artifact@"),
	);
	expect(upload.with.path).toBe(restore.with.path);
	expect(upload.with["if-no-files-found"]).toBe("error");
	expect(upload.with["include-hidden-files"]).toBe(true);
	for (const job of [jobs.test, aggregate]) {
		expect(
			job.steps.some((step: { uses: string }) =>
				step.uses?.startsWith("actions/cache/restore@"),
			),
		).toBe(false);
		expect(
			job.steps.find(
				(step: { uses: string; with: { name: string } }) =>
					step.uses?.startsWith("actions/download-artifact@") &&
					step.with.name === upload.with.name,
			).with.path,
		).toBe(".data");
	}
	expect(upload.with.name.startsWith("unit-durations-")).toBe(false);
	expect(
		jobs.test.steps.find((step: { uses: string }) =>
			step.uses?.startsWith("actions/upload-artifact@"),
		).with.path,
	).toMatch(/^\.data\/ci-test-durations-\$\{\{ matrix\.shard \}\}-of-4\.json$/);
	expect(aggregate.needs).toBe("test");
	expect(
		aggregate.steps.some((step: { run: string }) =>
			step.run?.includes("bun install"),
		),
	).toBe(false);
	expect(
		aggregate.steps.find(
			(step: { uses: string; with: { pattern: string } }) =>
				step.uses?.startsWith("actions/download-artifact@") &&
				step.with.pattern === "unit-durations-*",
		).with,
	).toMatchObject({
		pattern: "unit-durations-*",
		"merge-multiple": true,
		path: ".data",
	});
	expect(
		aggregate.steps.find(
			(step: { name: string }) =>
				step.name === "Validate and merge test durations",
		).run,
	).toContain("merge .data/ci-test-durations-{1,2,3,4}-of-4.json");
	const save = aggregate.steps.find(
		(step: { uses: string }) => step.uses === "actions/cache/save@v5",
	);
	expect(save.if).toBe(
		"github.ref == 'refs/heads/main' && github.event_name != 'pull_request'",
	);
	expect(save.with.path).toBe(restore.with.path);
	expect(save.with.key).toMatch(/\$\{\{ github\.sha \}\}$/);
});

it.each([
	null,
	JSON.stringify({
		version: "cached",
		results: [["test.ts", { duration: 123 }]],
	}),
])(
	"キャッシュ未作成でも入力を確定し、既存の計測値%sは書き換えない",
	(cached) => {
		const snapshot = workflows[0].jobs["test-snapshot"];
		expect(snapshot).toBeDefined();
		const freeze = snapshot.steps.find(
			(step: { name: string }) => step.name === "Freeze test duration snapshot",
		).run;
		const directory = mkdtempSync(join(tmpdir(), "evame-snapshot-test-"));
		const path = join(directory, ".data/ci-test-durations.json");
		try {
			expect(freeze).toMatch(/^nix develop --command /);
			const command = freeze.replace(/^nix develop --command /, "");
			writeFileSync(
				join(directory, "package.json"),
				JSON.stringify({ devDependencies: { vitest: "5.0.3" } }),
			);
			if (cached !== null) {
				mkdirSync(dirname(path), { recursive: true });
				writeFileSync(path, cached);
			}
			execFileSync("bash", ["-c", command], { cwd: directory });
			const frozen = readFileSync(path, "utf8");
			if (cached === null)
				expect(JSON.parse(frozen)).toEqual({ version: "5.0.3", results: [] });
			else expect(frozen).toBe(cached);
			execFileSync("bash", ["-c", command], { cwd: directory });
			expect(readFileSync(path, "utf8")).toBe(frozen);
		} finally {
			rmSync(directory, { recursive: true, force: true });
		}
	},
);

it("Preview専用ビルドは先に並列生成し、全検証後だけ同じ成果物を公開する", () => {
	const jobs = workflows[0].jobs;
	const build = jobs["preview-build"];
	expect(build.needs).toBeUndefined();
	expect(build.if).toBe(jobs.preview.if);
	expect(build.env.VITE_PUBLIC_DOMAIN).toBe(
		jobs.preview.env.VITE_PUBLIC_DOMAIN,
	);
	expect(build.env.VITE_AUTH_GOOGLE_ENABLED).toBe("false");
	expect(build.env.SENTRY_DSN).toBe("");
	expect(build.env.VITE_SENTRY_DSN).toBe("");
	expect(
		build.steps.some((step: { run: string }) =>
			step.run?.includes("bun run build"),
		),
	).toBe(true);
	expect(
		build.steps.some((step: { run: string }) =>
			step.run?.includes("preview:workers"),
		),
	).toBe(false);
	const upload = build.steps.find((step: { uses: string }) =>
		step.uses?.startsWith("actions/upload-artifact@"),
	);
	const download = jobs.preview.steps.find((step: { uses: string }) =>
		step.uses?.startsWith("actions/download-artifact@"),
	);
	expect(upload.with.name).toBe("preview-workers");
	expect(upload.with["if-no-files-found"]).toBe("error");
	expect(download.with.name).toBe(upload.with.name);
	expect(
		jobs.preview.steps.some((step: { run: string }) =>
			step.run?.includes("bun run build"),
		),
	).toBe(false);
	expect(
		jobs.preview.steps.find(
			(step: { name: string }) => step.name === "Restore Preview build",
		).run,
	).toContain("tar -xf");
});

it("依存取得のキャッシュを各インストール前に復元する", () => {
	for (const job of Object.values(workflows[0].jobs) as {
		steps: {
			uses?: string;
			run?: string;
			if?: string;
			with?: Record<string, string>;
		}[];
	}[]) {
		const installIndex = job.steps.findIndex((step) =>
			step.run?.includes("bun install --frozen-lockfile"),
		);
		if (installIndex === -1) continue;
		const cache = job.steps[installIndex - 1];
		expect(cache.uses).toBe("actions/cache@v5");
		expect(cache.with?.path).toBe("~/.bun/install/cache");
		expect(cache.with?.key).toContain("hashFiles('bun.lock', 'flake.lock')");
		expect(cache.if).toBe(job.steps[installIndex].if);
	}
});

it("iPhoneを一度だけビルドし、別MacでNativeと全UIを直列実行する", () => {
	const jobs = workflows[1].jobs;
	expect(jobs.build["runs-on"]).toBe("macos-26");
	expect(
		jobs.build.steps.some((step: { run: string }) =>
			step.run?.includes("ios.sh build-for-testing"),
		),
	).toBe(true);
	const tests = jobs.test;
	expect(tests.needs).toBe("build");
	expect(tests["runs-on"]).toBe("macos-26");
	expect(tests.strategy["fail-fast"]).toBe(false);
	expect(tests.strategy.matrix.include).toEqual([
		{ suite: "native", options: "-only-testing:NativeTests" },
		{
			suite: "ui-blocks",
			options: "-only-testing:EditorUITests/EditorBlockUITests",
		},
		{
			suite: "ui-other",
			options:
				"-only-testing:EditorUITests -skip-testing:EditorUITests/EditorBlockUITests",
		},
	]);
	expect(
		tests.steps.some((step: { run: string }) =>
			step.run?.includes("ios.sh test-without-building"),
		),
	).toBe(true);
	expect(jobs.build.env.DEVELOPER_DIR).toBe(tests.env.DEVELOPER_DIR);
	expect(
		jobs.build.steps.find((step: { uses: string }) =>
			step.uses?.startsWith("actions/upload-artifact@"),
		).with.name,
	).toBe(
		tests.steps.find((step: { uses: string }) =>
			step.uses?.startsWith("actions/download-artifact@"),
		).with.name,
	);
	expect(jobs.editor.needs).toEqual(["changes", "build", "test"]);
	expect(jobs.editor.if).toBe("always()");
	for (const result of ["failure", "cancelled", "skipped"]) {
		for (const failed of ["BUILD_RESULT", "TEST_RESULT"]) {
			expect(() =>
				execFileSync("bash", ["-c", jobs.editor.steps[0].run], {
					env: {
						...process.env,
						CHANGES_RESULT: "success",
						IOS_REQUIRED: "true",
						BUILD_RESULT: "success",
						TEST_RESULT: "success",
						[failed]: result,
					},
				}),
			).toThrow();
		}
	}
});

it.each([
	["build", "Archive Workers build", "workers.tar"],
	["preview-build", "Archive Preview build", "preview-workers.tar"],
])(
	"%sの成果物から秘密値を除外し、実行に必要な隠しファイルも保持する",
	(job, step, archiveName) => {
		const command = workflows[0].jobs[job].steps.find(
			(candidate: { name: string }) => candidate.name === step,
		).run;
		const directory = mkdtempSync(join(tmpdir(), "evame-archive-test-"));
		const secret = "dummy-ci-secret-only-for-archive-regression";
		const kept = [
			...(job === "build" ? [".data/browser-test.db"] : []),
			"dist/server/index.js",
			"dist/server/.vite/manifest.json",
			"dist/client/_astro/article.js",
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
			const archive = join(directory, archiveName);
			const members = execFileSync("tar", ["-tf", archive], {
				encoding: "utf8",
			}).split("\n");
			expect(readFileSync(archive).includes(Buffer.from(secret))).toBe(false);
			for (const path of excluded) expect(members).not.toContain(path);
			for (const path of kept) expect(members).toContain(path);
		} finally {
			rmSync(directory, { recursive: true, force: true });
		}
	},
);

it("ブラウザー全操作群はビルド時に一度だけ準備したSQLiteを成果物から受け取り、単体テストは空DBを使う", () => {
	const workflow = workflows[0];
	const steps = workflow.jobs.build.steps;
	const prepare = steps.findIndex(
		(step: { name: string }) => step.name === "Prepare browser test SQLite",
	);
	const archive = steps.findIndex(
		(step: { name: string }) => step.name === "Archive Workers build",
	);
	const connected = steps.find(
		(step: { name: string }) =>
			step.name === "Verify saving and public HTML in one Worker",
	);
	expect(prepare).toBeGreaterThan(-1);
	expect(prepare).toBeLessThan(archive);
	expect(steps[prepare].run).toContain(
		"scripts/test-database.mjs .data/browser-test.db",
	);
	expect(steps[archive].run).toContain(".data/browser-test.db");
	expect(connected.env.EVAME_TEST_DATABASE_TEMPLATE).toBe(
		".data/browser-test.db",
	);
	expect(workflow.jobs.browser.env.EVAME_TEST_DATABASE_TEMPLATE).toBe(
		".data/browser-test.db",
	);
	expect(
		workflow.jobs.browser.steps.find(
			(step: { name: string }) =>
				step.name === "Run prebuilt browsers with the Nix toolchain",
		).run,
	).toContain("--env EVAME_TEST_DATABASE_TEMPLATE");
	const tests = workflow.jobs.test.steps.find(
		(step: { name: string }) => step.name === "Run Tests",
	).run;
	expect(tests).toContain("scripts/ci-tests.mjs");
	expect(tests).not.toMatch(/db:prod:(migrate|seed)/);
});
