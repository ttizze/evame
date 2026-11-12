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

it("ChromiumとWebKitで全エディター操作群を重複なく検証し、Readerも残す", () => {
	const browser = workflows[0].jobs.browser;
	expect(browser.needs).toBe("build");
	expect(browser.strategy["fail-fast"]).toBe(false);
	expect(browser.strategy.matrix.browser).toEqual(["chromium", "webkit"]);
	expect(browser.strategy.matrix.suite).toEqual([
		"editor-drag",
		"editor-lists-clipboard",
		"editor-lists-structure",
		"editor-lists-formatting",
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
	expect(browser.steps.at(-1).run).toContain("--env EVAME_BROWSER_TYPE");
});

it("失敗・キャンセル・スキップした検証が一つでもあれば公開とプレビューを止める", () => {
	const workflow = workflows[0];
	const gate = workflow.jobs["ci-check"];
	expect(gate.needs).toEqual(["checks", "build", "browser"]);
	expect(gate.if).toBe("always()");
	for (const status of ["success", "failure", "cancelled", "skipped"]) {
		for (const failed of ["CHECKS_RESULT", "BUILD_RESULT", "BROWSER_RESULT"]) {
			const run = () =>
				execFileSync("bash", ["-c", gate.steps[0].run], {
					env: {
						...process.env,
						CHECKS_RESULT: "success",
						BUILD_RESULT: "success",
						BROWSER_RESULT: "success",
						[failed]: status,
					},
				});
			if (status === "success") expect(run).not.toThrow();
			else expect(run).toThrow();
		}
	}
	expect(workflow.jobs.preview.needs).toBe("ci-check");
	expect(
		gate.steps.findIndex(
			(step: { name: string }) => step.name === "Deploy Cloudflare Workers",
		),
	).toBeGreaterThan(0);
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
	expect(jobs.editor.needs).toEqual(["build", "test"]);
	expect(jobs.editor.if).toBe("always()");
	for (const result of ["failure", "cancelled", "skipped"]) {
		for (const failed of ["BUILD_RESULT", "TEST_RESULT"]) {
			expect(() =>
				execFileSync("bash", ["-c", jobs.editor.steps[0].run], {
					env: {
						...process.env,
						BUILD_RESULT: "success",
						TEST_RESULT: "success",
						[failed]: result,
					},
				}),
			).toThrow();
		}
	}
});

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
